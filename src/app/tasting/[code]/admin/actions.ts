'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { db } from '@/db/client'
import type { ActionState } from '@/lib/action-state'
import { getAdminTasting } from '@/lib/data'
import {
  criterionNameSchema,
  directionSchema,
  formValue,
  idSchema,
  settingsSchema,
  wineSchema,
} from '@/lib/validation'
import { addCriterion, deleteCriterion, moveCriterion, renameCriterion } from '@/server/criteria'
import { setTastingStatus, updateTastingSettings } from '@/server/tastings'
import { addWine, deleteWine, moveWine, updateWine } from '@/server/wines'

const refresh = (code: string) => revalidatePath(`/tasting/${code}`, 'layout')
const statusSchema = z.enum(['setup', 'active', 'finished'])
const INVALID: ActionState = { message: 'Ungültige Anfrage. Bitte lade die Seite neu.' }

export async function updateSettingsAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const raw = { name: formValue(fd, 'name'), blindTasting: fd.get('blindTasting') === 'on' }
  const parsed = settingsSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: { name: raw.name } }
  await updateTastingSettings(db, tasting.id, parsed.data)
  refresh(tasting.code)
  return { ok: true, message: 'Gespeichert.' }
}

export async function setStatusAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const parsed = statusSchema.safeParse(fd.get('to'))
  if (!parsed.success) return { message: 'Unbekannter Status.' }
  const result = await setTastingStatus(db, tasting.id, parsed.data)
  if (!result.ok) return { message: result.reason }
  refresh(tasting.code)
  return { ok: true }
}

const wineRaw = (fd: FormData) => ({
  name: formValue(fd, 'name'),
  vintage: formValue(fd, 'vintage'),
  grapeVariety: formValue(fd, 'grapeVariety'),
})

export async function addWineAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const raw = wineRaw(fd)
  const parsed = wineSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw }
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
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw }
  await updateWine(db, tasting.id, wineId, parsed.data)
  refresh(tasting.code)
  return { ok: true }
}

export async function deleteWineAction(code: string, wineId: string): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(wineId).success) return
  await deleteWine(db, tasting.id, wineId)
  refresh(tasting.code)
}

export async function moveWineAction(code: string, wineId: string, direction: 'up' | 'down'): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(wineId).success || !directionSchema.safeParse(direction).success) return
  await moveWine(db, tasting.id, wineId, direction)
  refresh(tasting.code)
}

export async function addCriterionAction(code: string, _prev: ActionState, fd: FormData): Promise<ActionState> {
  const tasting = await getAdminTasting(code)
  const raw = { name: formValue(fd, 'name') }
  const parsed = criterionNameSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw }
  await addCriterion(db, tasting.id, parsed.data.name)
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
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw }
  await renameCriterion(db, tasting.id, criterionId, parsed.data.name)
  refresh(tasting.code)
  return { ok: true }
}

export async function deleteCriterionAction(code: string, criterionId: string): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(criterionId).success) return
  // Das letzte Kriterium verweigert der Service; die UI deaktiviert den Button dann ohnehin
  await deleteCriterion(db, tasting.id, criterionId)
  refresh(tasting.code)
}

export async function moveCriterionAction(code: string, criterionId: string, direction: 'up' | 'down'): Promise<void> {
  const tasting = await getAdminTasting(code)
  if (!idSchema.safeParse(criterionId).success || !directionSchema.safeParse(direction).success) return
  await moveCriterion(db, tasting.id, criterionId, direction)
  refresh(tasting.code)
}
