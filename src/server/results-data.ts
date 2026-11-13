import { and, asc, eq, isNotNull } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { ratingValues, ratings, wines } from '@/db/schema'
import { computeResults, type Results, type ResultsInput } from '@/lib/tasting/results'
import { canSeeWineNames } from '@/lib/tasting/rules'
import { listCriteria } from './criteria'
import type { Tasting } from './tastings'
import { listWines } from './wines'

export async function loadResultsInput(db: Db, tastingId: string): Promise<Omit<ResultsInput, 'revealNames'>> {
  const [wineRows, criteriaRows, valueRows] = await Promise.all([
    listWines(db, tastingId),
    listCriteria(db, tastingId),
    db
      .select({
        participantId: ratings.participantId,
        wineId: ratings.wineId,
        criterionId: ratingValues.criterionId,
        value: ratingValues.value,
      })
      .from(ratingValues)
      .innerJoin(ratings, eq(ratingValues.ratingId, ratings.id))
      .innerJoin(wines, eq(ratings.wineId, wines.id))
      .where(eq(wines.tastingId, tastingId)),
  ])

  const grouped = new Map<string, ResultsInput['ratings'][number]>()
  for (const row of valueRows) {
    const key = `${row.participantId}:${row.wineId}`
    const entry = grouped.get(key) ?? { participantId: row.participantId, wineId: row.wineId, values: {} }
    entry.values[row.criterionId] = row.value
    grouped.set(key, entry)
  }

  return {
    wines: wineRows,
    criteria: criteriaRows.map(({ id, name, position, weight }) => ({ id, name, position, weight })),
    ratings: [...grouped.values()],
  }
}

/**
 * Results as this viewer may see them: the server decides about names – guests only see
 * blind wines once the tasting is finished. Also returns the input for callers that derive more from it.
 * `input` holds unredacted names and must never be rendered – use `results` for display.
 */
export async function loadResultsWithInput(
  db: Db,
  tasting: Pick<Tasting, 'id' | 'status' | 'blindTasting'>,
  isAdmin: boolean,
): Promise<{ input: Omit<ResultsInput, 'revealNames'>; results: Results }> {
  const input = await loadResultsInput(db, tasting.id)
  const results = computeResults({
    ...input,
    revealNames: canSeeWineNames({ status: tasting.status, blindTasting: tasting.blindTasting, isAdmin }),
  })
  return { input, results }
}

export async function loadResults(
  db: Db,
  tasting: Pick<Tasting, 'id' | 'status' | 'blindTasting'>,
  isAdmin: boolean,
): Promise<Results> {
  return (await loadResultsWithInput(db, tasting, isAdmin)).results
}

/**
 * Notes per wine, deliberately without any reference to the author. Sorted by the random rating ID
 * so the order doesn't reveal who wrote what either.
 */
export async function listWineNotes(db: Db, tastingId: string): Promise<Record<string, string[]>> {
  const rows = await db
    .select({ wineId: ratings.wineId, notes: ratings.notes })
    .from(ratings)
    .innerJoin(wines, eq(ratings.wineId, wines.id))
    .where(and(eq(wines.tastingId, tastingId), isNotNull(ratings.notes)))
    .orderBy(asc(ratings.id))

  const notes: Record<string, string[]> = {}
  for (const row of rows) {
    if (row.notes) (notes[row.wineId] ??= []).push(row.notes)
  }
  return notes
}
