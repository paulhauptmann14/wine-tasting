import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import type { Db } from '@/db/types'
import { ratings, tastings } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { computeResults } from '@/lib/tasting/results'
import { addCriterion, listCriteria } from './criteria'
import { joinTasting } from './participants'
import { getParticipantProgress, getRating, saveRating } from './ratings'
import { loadResultsInput } from './results-data'
import { addWine } from './wines'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

async function setup() {
  const t = await seedTasting(db, { preset: 'simple', status: 'active' })
  const [gesamt] = await listCriteria(db, t.id)
  const wine = await addWine(db, t.id, { name: 'Riesling', vintage: 2022, grapeVariety: null, sweetness: null, wineType: null })
  const { participant } = await joinTasting(db, t.id, 'Anna')
  return { t, gesamt, wine, participant }
}

describe('saveRating', () => {
  it('upserts one rating per participant and wine and replaces values', async () => {
    const { gesamt, wine, participant } = await setup()
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 3 }, notes: 'Apfel' })
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 5 }, notes: null })
    expect(await db.select().from(ratings)).toHaveLength(1)
    expect(await getRating(db, participant.id, wine.id)).toEqual({ notes: null, values: { [gesamt.id]: 5 } })
  })

  it('returns null when nothing was rated yet', async () => {
    const { wine, participant } = await setup()
    expect(await getRating(db, participant.id, wine.id)).toBeNull()
  })
})

describe('getParticipantProgress', () => {
  it('marks ratings incomplete after a criterion is added', async () => {
    const { t, gesamt, wine, participant } = await setup()
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: null })
    expect((await getParticipantProgress(db, t.id, participant.id)).get(wine.id)).toBe('complete')
    // Gastgeber geht zurück in die Vorbereitung und ergänzt ein Kriterium
    await db.update(tastings).set({ status: 'setup' }).where(eq(tastings.id, t.id))
    await addCriterion(db, t.id, 'Abgang')
    expect((await getParticipantProgress(db, t.id, participant.id)).get(wine.id)).toBe('incomplete')
  })
})

describe('loadResultsInput', () => {
  it('groups rating values per participant and wine', async () => {
    const { t, gesamt, wine, participant } = await setup()
    const ben = (await joinTasting(db, t.id, 'Ben')).participant
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 5 }, notes: null })
    await saveRating(db, { participantId: ben.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: null })
    const data = await loadResultsInput(db, t.id)
    expect(data.ratings).toHaveLength(2)
    const results = computeResults({ ...data, revealNames: false })
    expect(results.wines[0]).toMatchObject({ score: 4.5, rank: 1, name: null })
  })

  it('ignores ratings of other tastings', async () => {
    const { t, gesamt, wine, participant } = await setup()
    const other = await setup()
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 5 }, notes: null })
    await saveRating(db, {
      participantId: other.participant.id, wineId: other.wine.id, values: { [other.gesamt.id]: 1 }, notes: null,
    })
    expect((await loadResultsInput(db, t.id)).ratings).toEqual([
      { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 5 } },
    ])
  })
})
