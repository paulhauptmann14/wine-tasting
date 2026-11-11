import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { forceStatus, seedTasting, wineInput } from '@/test/factories'
import type { Db } from '@/db/types'
import { ratings } from '@/db/schema'
import { addCriterion, listCriteria } from './criteria'
import { joinTasting } from './participants'
import { getParticipantProgress, getRating, saveRating } from './ratings'
import { addWine, getWineByPosition, moveWine } from './wines'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

async function setup() {
  const t = await seedTasting(db, { preset: 'simple', status: 'active' })
  const [gesamt] = await listCriteria(db, t.id)
  const wine = await addWine(db, t.id, wineInput('Riesling', { vintage: 2022 }))
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
    expect((await getParticipantProgress(db, t.id, participant.id)).get(wine.id)).toBe('done')
    // Host goes back to setup and adds a criterion
    await forceStatus(db, t.id, 'setup')
    await addCriterion(db, t.id, 'Abgang')
    expect((await getParticipantProgress(db, t.id, participant.id)).get(wine.id)).toBe('incomplete')
  })
})

it('keeps a rating with its wine when the host reorders during the tasting', async () => {
  const { t, gesamt, wine, participant } = await setup()
  const other = await addWine(db, t.id, wineInput('Silvaner'))
  await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 5 }, notes: 'frisch' })

  await moveWine(db, t.id, wine.id, 'down')

  expect((await getWineByPosition(db, t.id, 1))?.id).toBe(other.id)
  expect((await getWineByPosition(db, t.id, 2))?.id).toBe(wine.id)
  expect(await getRating(db, participant.id, wine.id)).toMatchObject({ values: { [gesamt.id]: 5 }, notes: 'frisch' })
  expect(await getRating(db, participant.id, other.id)).toBeNull()
})
