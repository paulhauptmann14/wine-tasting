import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { forceStatus, seedTasting, wineInput } from '@/test/factories'
import type { Db } from '@/db/types'
import { listCriteria } from './criteria'
import { joinTasting } from './participants'
import { saveRating } from './ratings'
import { listWineNotes, loadResults, loadResultsInput } from './results-data'
import { addWine } from './wines'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

async function setup(opts: { blindTasting?: boolean } = {}) {
  const t = await seedTasting(db, { preset: 'simple', status: 'active', ...opts })
  const [gesamt] = await listCriteria(db, t.id)
  const wine = await addWine(db, t.id, wineInput('Riesling', { winery: 'Dr. Loosen', vintage: 2022 }))
  const { participant } = await joinTasting(db, t.id, 'Anna')
  return { t, gesamt, wine, participant }
}

describe('loadResultsInput', () => {
  it('passes wines and criteria through and groups rating values per participant and wine', async () => {
    const { t, gesamt, wine, participant } = await setup()
    const ben = (await joinTasting(db, t.id, 'Ben')).participant
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 5 }, notes: null })
    await saveRating(db, { participantId: ben.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: null })
    const data = await loadResultsInput(db, t.id)
    expect(data.wines).toMatchObject([{ id: wine.id, name: 'Riesling', winery: 'Dr. Loosen', position: 1, vintage: 2022 }])
    expect(data.criteria).toEqual([{ id: gesamt.id, name: 'Gesamt', position: 1, weight: 1 }])
    expect(data.ratings).toEqual(
      expect.arrayContaining([
        { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 5 } },
        { participantId: ben.id, wineId: wine.id, values: { [gesamt.id]: 4 } },
      ]),
    )
    expect(data.ratings).toHaveLength(2)
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

describe('loadResults', () => {
  it('withholds blind names from guests until the end, never from the host', async () => {
    const { t, gesamt, wine, participant } = await setup({ blindTasting: true })
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: null })
    expect((await loadResults(db, t, false)).wines[0]).toMatchObject({ score: 4, rank: 1, name: null, winery: null, vintage: null })
    expect((await loadResults(db, t, true)).wines[0]).toMatchObject({ name: 'Riesling', winery: 'Dr. Loosen', vintage: 2022 })
    const finished = await forceStatus(db, t.id, 'finished')
    expect((await loadResults(db, finished, false)).wines[0]).toMatchObject({ name: 'Riesling' })
  })
})

describe('listWineNotes', () => {
  it('groups notes per wine without any reference to the author', async () => {
    const t = await seedTasting(db, { preset: 'simple', status: 'active' })
    const [gesamt] = await listCriteria(db, t.id)
    const riesling = await addWine(db, t.id, wineInput('Riesling'))
    const silvaner = await addWine(db, t.id, wineInput('Silvaner'))
    const anna = (await joinTasting(db, t.id, 'Anna')).participant
    const ben = (await joinTasting(db, t.id, 'Ben')).participant
    const rate = (participantId: string, wineId: string, notes: string | null) =>
      saveRating(db, { participantId, wineId, values: { [gesamt.id]: 4 }, notes })

    await rate(anna.id, riesling.id, 'Pfirsich, sehr frisch')
    await rate(ben.id, riesling.id, 'Zu sauer')
    await rate(anna.id, silvaner.id, null)

    const notes = await listWineNotes(db, t.id)
    expect(Object.keys(notes)).toEqual([riesling.id])
    expect([...notes[riesling.id]].sort()).toEqual(['Pfirsich, sehr frisch', 'Zu sauer'])
    expect(JSON.stringify(notes)).not.toMatch(/Anna|Ben|participant/)
  })

  it('ignores notes from other tastings', async () => {
    const t = await seedTasting(db, { preset: 'simple', status: 'active' })
    const other = await seedTasting(db, { preset: 'simple', status: 'active' })
    const [gesamt] = await listCriteria(db, other.id)
    const wine = await addWine(db, other.id, wineInput('Riesling'))
    const { participant } = await joinTasting(db, other.id, 'Anna')
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: 'fremd' })

    expect(await listWineNotes(db, t.id)).toEqual({})
  })
})

describe('loadResults winery', () => {
  it('stays out of the data a guest receives until a blind tasting is finished', async () => {
    const { t, gesamt, wine, participant } = await setup({ blindTasting: true })
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: null })
    expect(JSON.stringify(await loadResults(db, t, false))).not.toMatch(/Loosen|Riesling/)
    const finished = await forceStatus(db, t.id, 'finished')
    expect((await loadResults(db, finished, false)).wines[0]).toMatchObject({ winery: 'Dr. Loosen' })
  })

  it('is shown right away in an open tasting', async () => {
    const { t } = await setup({ blindTasting: false })
    expect((await loadResults(db, t, false)).wines[0]).toMatchObject({ winery: 'Dr. Loosen' })
  })
})

describe('loadResults description', () => {
  async function described(blindTasting: boolean) {
    const t = await seedTasting(db, { preset: 'simple', status: 'active', blindTasting })
    const [gesamt] = await listCriteria(db, t.id)
    const wine = await addWine(db, t.id, wineInput('Innamorati', { description: 'Süß & fruchtig' }))
    const { participant } = await joinTasting(db, t.id, 'Anna')
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: null })
    return t
  }

  it('stays out of the data a guest receives until a blind tasting is finished, the admin always gets it', async () => {
    const t = await described(true)
    expect(JSON.stringify(await loadResults(db, t, false))).not.toMatch(/fruchtig/)
    expect((await loadResults(db, t, true)).wines[0]).toMatchObject({ description: 'Süß & fruchtig' })
    const finished = await forceStatus(db, t.id, 'finished')
    expect((await loadResults(db, finished, false)).wines[0]).toMatchObject({ description: 'Süß & fruchtig' })
  })

  it('is shown right away in an open tasting', async () => {
    const t = await described(false)
    expect((await loadResults(db, t, false)).wines[0]).toMatchObject({ description: 'Süß & fruchtig' })
  })
})
