'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { getCurrentParticipant, setParticipantCookie } from '@/lib/auth/participant-session'
import type { ActionState } from '@/lib/action-state'
import { requireTasting } from '@/lib/data'
import { canJoin, canRate } from '@/lib/tasting/rules'
import { formValue, idSchema, invalid, joinSchema, parseRatingForm, positionSchema } from '@/lib/validation'
import { listCriteria } from '@/server/criteria'
import { joinTasting } from '@/server/participants'
import { saveRating } from '@/server/ratings'
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

/**
 * Bound to the wine ID, not the number: if the host deletes or moves a wine meanwhile,
 * the stars still land on the right wine.
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
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results?ended=1`)
  // Only 'setup' is left: the host went back to preparation while the guest was rating
  if (!canRate(tasting.status)) {
    return { message: 'Der Gastgeber hat kurz angehalten. Deine Sterne stehen noch hier – speicher gleich nochmal.' }
  }

  const wine = idSchema.safeParse(wineId).success ? await getWineById(db, tasting.id, wineId) : null
  if (!wine) return { message: 'Diesen Wein gibt es nicht mehr.' }
  // The host reordered or shuffled while this page was open: the glass in front of the guest is now
  // another wine. Don't guess where the stars belong – ask for a reload instead.
  const shown = positionSchema.safeParse(shownPosition)
  if (!shown.success || shown.data !== wine.position) {
    const label = shown.success ? `Wein #${shown.data}` : 'Dieser Wein'
    return {
      reload: true,
      message: `Der Gastgeber hat die Reihenfolge gerade geändert – ${label} ist jetzt ein anderer. Lade die Seite neu und bewerte noch einmal.`,
    }
  }
  const parsed = parseRatingForm(formData, await listCriteria(db, tasting.id))
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, message: parsed.message }

  await saveRating(db, { participantId: participant.id, wineId: wine.id, values: parsed.values, notes: parsed.notes })
  revalidatePath(`/tasting/${tasting.code}`, 'layout')

  // Next wine in the current order – the one just saved may have a different number by now
  const total = await countWines(db, tasting.id)
  redirect(
    wine.position < total
      ? `/tasting/${tasting.code}/wine/${wine.position + 1}?saved=${wine.position}`
      : `/tasting/${tasting.code}?saved=${wine.position}`,
  )
}
