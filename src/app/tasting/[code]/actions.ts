'use server'

import { revalidatePath } from 'next/cache'
import { notFound, redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/db/client'
import { getCurrentParticipant, setParticipantCookie } from '@/lib/auth/participant-session'
import type { ActionState } from '@/lib/action-state'
import { getTasting } from '@/lib/data'
import { canJoin, canRate } from '@/lib/tasting/rules'
import { formValue, joinSchema, parseRatingForm } from '@/lib/validation'
import { listCriteria } from '@/server/criteria'
import { joinTasting } from '@/server/participants'
import { saveRating } from '@/server/ratings'
import { getWineByPosition, listWines } from '@/server/wines'

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

export async function saveRatingAction(
  code: string,
  position: number,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  const participant = await getCurrentParticipant(tasting)
  if (!participant) redirect(`/tasting/${tasting.code}`)
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)
  if (!canRate(tasting.status)) return { message: 'Das Tasting hat noch nicht begonnen.' }

  const wine = await getWineByPosition(db, tasting.id, position)
  if (!wine) return { message: 'Diesen Wein gibt es nicht mehr.' }
  const parsed = parseRatingForm(formData, await listCriteria(db, tasting.id))
  if (!parsed.ok) return { fieldErrors: parsed.fieldErrors, message: 'Bitte vergib für jedes Kriterium Sterne.' }

  await saveRating(db, { participantId: participant.id, wineId: wine.id, values: parsed.values, notes: parsed.notes })
  revalidatePath(`/tasting/${tasting.code}`, 'layout')

  const total = (await listWines(db, tasting.id)).length
  redirect(
    position < total
      ? `/tasting/${tasting.code}/wine/${position + 1}?saved=${position}`
      : `/tasting/${tasting.code}?saved=${position}`,
  )
}
