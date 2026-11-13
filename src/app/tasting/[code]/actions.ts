'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db/client'
import { getCurrentParticipant, setParticipantCookie } from '@/lib/auth/participant-session'
import type { ActionState } from '@/lib/action-state'
import { requireTasting } from '@/lib/data'
import { getSessionSecret } from '@/lib/env'
import { canJoin, canRate } from '@/lib/tasting/rules'
import { formValue, idSchema, invalid, joinSchema, parseRatingForm, positionSchema } from '@/lib/validation'
import { listCriteria } from '@/server/criteria'
import { joinTasting, rejoinTasting } from '@/server/participants'
import { saveGuestRating, type GuestRatingResult } from '@/server/ratings'
import { countWines, getWineById } from '@/server/wines'

export async function joinAction(code: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const tasting = await requireTasting(code)
  if (!canJoin(tasting.status)) redirect(`/tasting/${tasting.code}/results`)

  const raw = { name: formValue(formData, 'name') }
  const parsed = joinSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error, raw)

  const { token, expiresAt } = await joinTasting(db, tasting.id, parsed.data.name)
  await setParticipantCookie(tasting.code, token, expiresAt)
  revalidatePath(`/tasting/${tasting.code}`, 'layout')
  redirect(`/tasting/${tasting.code}`)
}

// Bound from the client – only a length check here, rejoinTasting() checks shape and signature
const rejoinLinkSchema = z.string().max(100)

/**
 * "Als Anna weitermachen": a new session for the guest of the rejoin link the host sent.
 * The form has no fields – useActionState's (prev, formData) are simply not taken.
 */
export async function rejoinAction(code: string, link: unknown): Promise<ActionState> {
  const tasting = await requireTasting(code)
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)

  const parsed = rejoinLinkSchema.safeParse(link)
  const rejoined = parsed.success ? await rejoinTasting(db, tasting.id, parsed.data, getSessionSecret()) : null
  if (!rejoined) return { message: 'Dieser Link gilt nicht mehr. Frag den Gastgeber nach einem neuen.' }

  await setParticipantCookie(tasting.code, rejoined.token, rejoined.expiresAt)
  revalidatePath(`/tasting/${tasting.code}`, 'layout')
  redirect(`/tasting/${tasting.code}`)
}

type RefusedReason = Extract<GuestRatingResult, { ok: false }>['reason']

/** Why a rating was not stored, in the guest's words; a finished tasting sends them to the results. */
function ratingRefused(code: string, reason: RefusedReason, shown: number | null): ActionState {
  switch (reason) {
    case 'finished':
      redirect(`/tasting/${code}/results?ended=1`)
    case 'paused':
      // The host went back to preparation while the guest was rating
      return { message: 'Der Gastgeber hat kurz angehalten. Deine Sterne stehen noch hier – speicher gleich nochmal.' }
    case 'wine_gone':
      return { message: 'Diesen Wein gibt es nicht mehr.' }
    case 'moved': {
      // The host reordered or shuffled while this page was open: the glass in front of the guest is now
      // another wine. Don't guess where the stars belong – ask for a reload instead.
      const label = shown === null ? 'Dieser Wein' : `Wein #${shown}`
      return {
        reload: true,
        message: `Der Gastgeber hat die Reihenfolge gerade geändert – ${label} ist jetzt ein anderer. Lade die Seite neu und bewerte noch einmal.`,
      }
    }
  }
}

/**
 * Bound to the wine ID, not the number: if the host deletes or moves a wine meanwhile,
 * the stars still land on the right wine. `shownPosition` is the number the page showed;
 * saveGuestRating checks it and the status again in the saving transaction.
 */
export async function saveRatingAction(
  code: string,
  wineId: string,
  shownPosition: unknown,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tasting = await requireTasting(code)
  const participant = await getCurrentParticipant(tasting)
  if (!participant) redirect(`/tasting/${tasting.code}`)
  // Early answers from the lookup; the transaction in saveGuestRating has the last word
  if (!canRate(tasting.status)) {
    return ratingRefused(tasting.code, tasting.status === 'finished' ? 'finished' : 'paused', null)
  }
  if (!idSchema.safeParse(wineId).success) return ratingRefused(tasting.code, 'wine_gone', null)
  const shown = positionSchema.safeParse(shownPosition)
  if (!shown.success) return ratingRefused(tasting.code, 'moved', null)
  // Before the form check: a guest whose wine was moved or deleted shouldn't fix missing stars first
  // and lose them on the reload afterwards
  const [wine, criteria] = await Promise.all([getWineById(db, tasting.id, wineId), listCriteria(db, tasting.id)])
  if (!wine) return ratingRefused(tasting.code, 'wine_gone', shown.data)
  if (wine.position !== shown.data) return ratingRefused(tasting.code, 'moved', shown.data)

  const parsed = parseRatingForm(formData, criteria)
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, message: parsed.message }

  const saved = await saveGuestRating(db, {
    tastingId: tasting.id,
    participantId: participant.id,
    wineId,
    shownPosition: shown.data,
    values: parsed.values,
    notes: parsed.notes,
  })
  if (!saved.ok) return ratingRefused(tasting.code, saved.reason, shown.data)
  revalidatePath(`/tasting/${tasting.code}`, 'layout')

  // Next wine in the current order
  const total = await countWines(db, tasting.id)
  redirect(
    saved.position < total
      ? `/tasting/${tasting.code}/wine/${saved.position + 1}?saved=${saved.position}`
      : `/tasting/${tasting.code}?saved=${saved.position}`,
  )
}
