'use server'

import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db/client'
import { getCurrentParticipant, setParticipantCookie } from '@/lib/auth/participant-session'
import type { ActionState } from '@/lib/action-state'
import { getTasting } from '@/lib/data'
import { canJoin, canRate } from '@/lib/tasting/rules'
import { formValue, idSchema, joinSchema, parseRatingForm } from '@/lib/validation'
import { listCriteria } from '@/server/criteria'
import { joinTasting } from '@/server/participants'
import { saveRating } from '@/server/ratings'
import { getWineById, listWines } from '@/server/wines'

export async function joinAction(code: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  if (!canJoin(tasting.status)) redirect(`/tasting/${tasting.code}/results`)

  const raw = { name: formValue(formData, 'name') }
  const parsed = joinSchema.safeParse(raw)
  if (!parsed.success) return { fieldErrors: z.flattenError(parsed.error).fieldErrors, values: raw }

  const { token, expiresAt } = await joinTasting(db, tasting.id, parsed.data.name)
  await setParticipantCookie(tasting.code, token, expiresAt)
  revalidatePath(`/tasting/${tasting.code}`, 'layout')
  redirect(`/tasting/${tasting.code}`)
}

/**
 * Gebunden an die Wein-ID, nicht an die Nummer: Löscht oder verschiebt der Gastgeber
 * währenddessen einen Wein, landen die Sterne trotzdem beim richtigen Wein.
 */
export async function saveRatingAction(
  code: string,
  wineId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  const participant = await getCurrentParticipant(tasting)
  if (!participant) redirect(`/tasting/${tasting.code}`)
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)
  if (!canRate(tasting.status)) return { message: 'Das Tasting hat noch nicht begonnen.' }

  const wine = idSchema.safeParse(wineId).success ? await getWineById(db, tasting.id, wineId) : null
  if (!wine) return { message: 'Diesen Wein gibt es nicht mehr.' }
  const parsed = parseRatingForm(formData, await listCriteria(db, tasting.id))
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, message: 'Bitte vergib für jedes Kriterium Sterne.' }

  await saveRating(db, { participantId: participant.id, wineId: wine.id, values: parsed.values, notes: parsed.notes })
  revalidatePath(`/tasting/${tasting.code}`, 'layout')

  // Nächster Wein nach der aktuellen Reihenfolge – der gerade gespeicherte kann inzwischen eine andere Nummer haben
  const total = (await listWines(db, tasting.id)).length
  redirect(
    wine.position < total
      ? `/tasting/${tasting.code}/wine/${wine.position + 1}?saved=${wine.position}`
      : `/tasting/${tasting.code}?saved=${wine.position}`,
  )
}
