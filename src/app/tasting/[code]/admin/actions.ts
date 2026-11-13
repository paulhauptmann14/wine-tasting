'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db/client'
import { clearAdminCookie } from '@/lib/auth/admin-session'
import { clearParticipantCookie } from '@/lib/auth/participant-session'
import type { ActionState } from '@/lib/action-state'
import { getAdminTasting } from '@/lib/data'
import { normalizeCode } from '@/lib/tasting/code'
import { SHUFFLE_TOO_FEW_HINT } from '@/lib/tasting/rules'
import {
  criterionNameSchema,
  directionSchema,
  formValue,
  idSchema,
  invalid,
  settingsSchema,
  statusSchema,
  type Direction,
  wineSchema,
} from '@/lib/validation'
import { PRESET_KEYS } from '@/lib/tasting/presets'
import { addCriterion, applyPreset, deleteCriterion, moveCriterion, renameCriterion } from '@/server/criteria'
import { StructureLockedError } from '@/server/structure'
import { lockRejoinLink, removeParticipant } from '@/server/participants'
import { deleteTasting, updateTastingDetails, setBlindTasting, setTastingStatus } from '@/server/tastings'
import { addWine, deleteWine, moveWine, shuffleWines, updateWine } from '@/server/wines'

const refresh = (code: string) => revalidatePath(`/tasting/${code}`, 'layout')
const INVALID: ActionState = { message: 'Ungültige Anfrage. Bitte lade die Seite neu.' }

/** Silently ignore locked structure changes (tasting running) – the UI disables the buttons anyway. */
async function unlessLocked(change: () => Promise<unknown>): Promise<void> {
  try {
    await change()
  } catch (error) {
    if (!(error instanceof StructureLockedError)) throw error
  }
}

export async function updateSettingsAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  // Name and description – the blind tasting switch saves itself instantly (updateBlindTastingAction)
  const raw = { name: formValue(fd, 'name'), description: formValue(fd, 'description') }
  const parsed = settingsSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error, raw)
  await updateTastingDetails(db, tasting.id, parsed.data)
  refresh(tasting.code)
  return { ok: true, message: 'Gespeichert.' }
}

/** The switch saves instantly. Setup only – the service enforces it, otherwise names would be revealed mid-tasting. */
export async function updateBlindTastingAction(code: string, blindTasting: unknown): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const parsed = z.boolean().safeParse(blindTasting)
  if (!parsed.success) return INVALID
  try {
    await setBlindTasting(db, tasting.id, parsed.data)
  } catch (error) {
    if (error instanceof StructureLockedError) return { message: 'Lässt sich nur in der Vorbereitung ändern.' }
    throw error
  }
  refresh(tasting.code)
  return { ok: true }
}

export async function setStatusAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const parsed = statusSchema.safeParse(fd.get('to'))
  if (!parsed.success) return { message: 'Unbekannter Status.' }
  const result = await setTastingStatus(db, tasting.id, parsed.data)
  if (!result.ok) return { message: result.reason, values: { nonce: String(Date.now()) } }
  refresh(tasting.code)
  return { ok: true }
}

const wineRaw = (fd: FormData) => ({
  name: formValue(fd, 'name'),
  winery: formValue(fd, 'winery'),
  vintage: formValue(fd, 'vintage'),
  grapeVariety: formValue(fd, 'grapeVariety'),
  sweetness: formValue(fd, 'sweetness'),
  wineType: formValue(fd, 'wineType'),
  description: formValue(fd, 'description'),
  alcohol: formValue(fd, 'alcohol'),
})

export async function addWineAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const raw = wineRaw(fd)
  const parsed = wineSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error, raw)
  await addWine(db, tasting.id, parsed.data)
  refresh(tasting.code)
  return { ok: true }
}

export async function updateWineAction(
  code: string,
  wineId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(wineId).success) return INVALID
  const raw = wineRaw(fd)
  const parsed = wineSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error, raw)
  await updateWine(db, tasting.id, wineId, parsed.data)
  refresh(tasting.code)
  return { ok: true }
}

export async function deleteWineAction(code: string, wineId: string): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(wineId).success) return
  await unlessLocked(() => deleteWine(db, tasting.id, wineId))
  refresh(tasting.code)
}

export async function moveWineAction(code: string, wineId: string, direction: Direction): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(wineId).success || !directionSchema.safeParse(direction).success) return
  await moveWine(db, tasting.id, wineId, direction)
  refresh(tasting.code)
}

/** Shuffles the wines nobody rated yet; the message is shown next to the button. */
export async function shuffleWinesAction(code: string): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const result = await shuffleWines(db, tasting.id)
  if (!result.ok) return { message: result.reason }
  refresh(tasting.code)
  if (result.shuffled === 0) return { message: SHUFFLE_TOO_FEW_HINT, values: { nonce: String(Date.now()) } }
  return {
    ok: true,
    message: `Neu: ${result.order.map((name, i) => `${i + 1} ${name}`).join(', ')}`,
    values: { nonce: String(Date.now()) },
  }
}

export async function addCriterionAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const raw = { name: formValue(fd, 'name') }
  const parsed = criterionNameSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error, raw)
  try {
    await addCriterion(db, tasting.id, parsed.data.name)
  } catch (error) {
    if (error instanceof StructureLockedError) return { message: error.message, values: raw }
    throw error
  }
  refresh(tasting.code)
  return { ok: true }
}

export async function renameCriterionAction(
  code: string,
  criterionId: string,
  _prev: ActionState,
  fd: FormData,
): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(criterionId).success) return INVALID
  const raw = { name: formValue(fd, 'name') }
  const parsed = criterionNameSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error, raw)
  await renameCriterion(db, tasting.id, criterionId, parsed.data.name)
  refresh(tasting.code)
  return { ok: true }
}

export async function deleteCriterionAction(code: string, criterionId: string): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(criterionId).success) return
  // The service refuses to delete the last criterion; the UI disables the button then anyway
  await unlessLocked(() => deleteCriterion(db, tasting.id, criterionId))
  refresh(tasting.code)
}

export async function moveCriterionAction(code: string, criterionId: string, direction: Direction): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(criterionId).success || !directionSchema.safeParse(direction).success) return
  await unlessLocked(() => moveCriterion(db, tasting.id, criterionId, direction))
  refresh(tasting.code)
}

/** Switches the rating system (scale + all criteria). Setup only and only without ratings – the service enforces both. */
export async function applyPresetAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const parsed = z.enum(PRESET_KEYS).safeParse(fd.get('preset'))
  if (!parsed.success) return { message: 'Wähle ein Bewertungssystem aus.' }
  try {
    const result = await applyPreset(db, tasting.id, parsed.data)
    if (!result.ok) return { message: result.reason }
  } catch (error) {
    if (error instanceof StructureLockedError) {
      return { message: 'Das Bewertungssystem lässt sich nur in der Vorbereitung ändern.' }
    }
    throw error
  }
  refresh(tasting.code)
  return { ok: true }
}

export async function removeParticipantAction(code: string, participantId: string): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(participantId).success) return
  await removeParticipant(db, tasting.id, participantId)
  refresh(tasting.code)
}

/** "Link sperren": the guest's older rejoin links stop working, the page then shows a new one. */
export async function lockRejoinLinkAction(code: string, participantId: unknown): Promise<void> {
  const tasting = await getAdminTasting(code)
  const id = idSchema.safeParse(participantId)
  if (!id.success) return
  await lockRejoinLink(db, tasting.id, id.data)
  refresh(tasting.code)
}

/** Deleting requires typing the code – so it can't happen by accident. */
export async function deleteTastingAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const confirm = formValue(fd, 'confirm')
  if (normalizeCode(confirm) !== tasting.code) {
    return { fieldErrors: { confirm: ['Gib zur Bestätigung den Code des Tastings ein.'] }, values: { confirm } }
  }
  await deleteTasting(db, tasting.id)
  await clearAdminCookie(tasting.code)
  await clearParticipantCookie(tasting.code)
  // The home page confirms it once ("Tasting gelöscht.")
  redirect('/?deleted=1')
}
