import { and, count, eq, sql } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { ratingValues, ratings } from '@/db/schema'
import { ratingState, type RingState } from '@/lib/tasting/progress'
import { countCriteria } from './criteria'

export async function saveRating(
  db: Db,
  input: { participantId: string; wineId: string; values: Record<string, number>; notes: string | null },
): Promise<void> {
  await db.transaction(async (tx) => {
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
