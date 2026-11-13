import { and, count, eq, sql } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { ratingValues, ratings, tastings, wines } from '@/db/schema'
import { ratingState, type RingState } from '@/lib/tasting/progress'
import { canRate } from '@/lib/tasting/rules'
import { countCriteria } from './criteria'

type RatingInput = { participantId: string; wineId: string; values: Record<string, number>; notes: string | null }

async function writeRating(tx: Db, input: RatingInput): Promise<void> {
  const [rating] = await tx
    .insert(ratings)
    .values({ participantId: input.participantId, wineId: input.wineId, notes: input.notes })
    .onConflictDoUpdate({
      target: [ratings.participantId, ratings.wineId],
      set: { notes: input.notes, updatedAt: sql`now()` },
    })
    .returning({ id: ratings.id })
  await tx.delete(ratingValues).where(eq(ratingValues.ratingId, rating.id))
  const entries = Object.entries(input.values)
  if (entries.length > 0) {
    await tx
      .insert(ratingValues)
      .values(entries.map(([criterionId, value]) => ({ ratingId: rating.id, criterionId, value })))
  }
}

/** Stores a rating without any checks – guests save through saveGuestRating. */
export async function saveRating(db: Db, input: RatingInput): Promise<void> {
  await db.transaction((tx) => writeRating(tx, input))
}

export type GuestRatingResult =
  | { ok: true; position: number }
  | { ok: false; reason: 'paused' | 'finished' | 'wine_gone' | 'moved' }

/**
 * A guest saves the rating for the wine shown as number `shownPosition`. Status and number are checked in
 * the same transaction as the write, with the tasting row locked FOR SHARE: a status change
 * (setTastingStatus, FOR UPDATE) or a reorder (addWine, moveWine, deleteWine, shuffleWines –
 * FOR NO KEY UPDATE) either commits first and is seen here, or waits until this rating is committed.
 * Guests saving at the same time don't block each other.
 */
export async function saveGuestRating(
  db: Db,
  input: RatingInput & { tastingId: string; shownPosition: number },
): Promise<GuestRatingResult> {
  return db.transaction(async (tx) => {
    const [tasting] = await tx
      .select({ status: tastings.status })
      .from(tastings)
      .where(eq(tastings.id, input.tastingId))
      .for('share')
    if (!tasting) return { ok: false, reason: 'wine_gone' } as const
    if (tasting.status === 'finished') return { ok: false, reason: 'finished' } as const
    if (!canRate(tasting.status)) return { ok: false, reason: 'paused' } as const

    const [wine] = await tx
      .select({ position: wines.position })
      .from(wines)
      .where(and(eq(wines.id, input.wineId), eq(wines.tastingId, input.tastingId)))
    if (!wine) return { ok: false, reason: 'wine_gone' } as const
    // Reordered or shuffled since the page was rendered: the glass in front of the guest is another wine
    if (wine.position !== input.shownPosition) return { ok: false, reason: 'moved' } as const

    await writeRating(tx, input)
    return { ok: true, position: wine.position } as const
  })
}

export async function getRating(db: Db, participantId: string, wineId: string) {
  const [rating] = await db
    .select({ id: ratings.id, notes: ratings.notes })
    .from(ratings)
    .where(and(eq(ratings.participantId, participantId), eq(ratings.wineId, wineId)))
  if (!rating) return null
  const values = await db
    .select({ criterionId: ratingValues.criterionId, value: ratingValues.value })
    .from(ratingValues)
    .where(eq(ratingValues.ratingId, rating.id))
  return {
    notes: rating.notes,
    values: Object.fromEntries(values.map((v) => [v.criterionId, v.value])) as Record<string, number>,
  }
}

/** Values of deleted criteria go away via cascade – the count is enough to check completeness. */
export async function getParticipantProgress(
  db: Db,
  tastingId: string,
  participantId: string,
): Promise<Map<string, RingState>> {
  const criteriaCount = await countCriteria(db, tastingId)
  const rows = await db
    .select({ wineId: ratings.wineId, valueCount: count(ratingValues.id) })
    .from(ratings)
    .leftJoin(ratingValues, eq(ratingValues.ratingId, ratings.id))
    .where(eq(ratings.participantId, participantId))
    .groupBy(ratings.wineId)
  return new Map(rows.map((r) => [r.wineId, ratingState(r.valueCount, criteriaCount)]))
}
