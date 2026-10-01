import { eq } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { ratingValues, ratings, wines } from '@/db/schema'
import type { ResultsInput } from '@/lib/tasting/results'
import { listCriteria } from './criteria'
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
    criteria: criteriaRows.map(({ id, name, position }) => ({ id, name, position })),
    ratings: [...grouped.values()],
  }
}
