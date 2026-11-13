import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { forceStatus, seedTasting, wineInput } from '@/test/factories'
import { locksTastingRow } from '@/test/locks'
import type { Db } from '@/db/types'
import { ratings } from '@/db/schema'
import { addCriterion, listCriteria } from './criteria'
import { joinTasting } from './participants'
import { getParticipantProgress, getRating, saveGuestRating, saveRating } from './ratings'
import { addWine, deleteWine, getWineByPosition, moveWine } from './wines'

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

  it('keeps only the values of the latest save', async () => {
    const { t, gesamt, wine, participant } = await setup()
    await forceStatus(db, t.id, 'setup')
    const abgang = await addCriterion(db, t.id, 'Abgang')
    const save = (values: Record<string, number>, notes: string | null) =>
      saveRating(db, { participantId: participant.id, wineId: wine.id, values, notes })

    await save({ [gesamt.id]: 3, [abgang.id]: 2 }, 'Apfel')
    expect(await getRating(db, participant.id, wine.id)).toEqual({
      notes: 'Apfel',
      values: { [gesamt.id]: 3, [abgang.id]: 2 },
    })
    await save({ [abgang.id]: 5 }, null)
    expect(await getRating(db, participant.id, wine.id)).toEqual({ notes: null, values: { [abgang.id]: 5 } })
    // A rating without values (only possible before any criterion existed) still has its notes
    await save({}, 'nur Notiz')
    expect(await getRating(db, participant.id, wine.id)).toEqual({ notes: 'nur Notiz', values: {} })
  })

  it('reads only the rating of this guest for this wine', async () => {
    const { t, gesamt, wine, participant } = await setup()
    const other = await addWine(db, t.id, wineInput('Silvaner'))
    const { participant: ben } = await joinTasting(db, t.id, 'Ben')
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 2 }, notes: 'A' })
    await saveRating(db, { participantId: ben.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: 'B' })
    await saveRating(db, { participantId: participant.id, wineId: other.id, values: { [gesamt.id]: 5 }, notes: 'C' })
    expect(await getRating(db, participant.id, wine.id)).toEqual({ notes: 'A', values: { [gesamt.id]: 2 } })
    expect(await getRating(db, ben.id, other.id)).toBeNull()
  })
})

describe('getParticipantProgress', () => {
  it('is empty before the guest rated anything', async () => {
    const { t, participant } = await setup()
    expect((await getParticipantProgress(db, t.id, participant.id)).size).toBe(0)
  })

  it('counts only the criteria of this tasting', async () => {
    const { t, gesamt, wine, participant } = await setup()
    // Another tasting with more criteria must not make this rating look incomplete
    await seedTasting(db, { preset: 'five', status: 'active' })
    await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: null })
    expect((await getParticipantProgress(db, t.id, participant.id)).get(wine.id)).toBe('done')
  })

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

describe('saveGuestRating', () => {
  const guestRating = async () => {
    const { t, gesamt, wine, participant } = await setup()
    const input = {
      tastingId: t.id,
      participantId: participant.id,
      wineId: wine.id,
      shownPosition: 1,
      values: { [gesamt.id]: 4 },
      notes: 'Pfirsich',
    }
    return { t, gesamt, wine, participant, input }
  }

  it('saves while the tasting runs and the wine still has the number the guest saw', async () => {
    const { gesamt, wine, participant, input } = await guestRating()
    // total = wines of this tasting, for the way on to the next one
    const other = await seedTasting(db, { preset: 'simple', status: 'active' })
    await addWine(db, other.id, wineInput('Fremd'))
    expect(await saveGuestRating(db, input)).toEqual({ ok: true, position: 1, total: 1 })
    expect(await getRating(db, participant.id, wine.id)).toEqual({ notes: 'Pfirsich', values: { [gesamt.id]: 4 } })
  })

  it('stores nothing once the host paused or ended the tasting', async () => {
    const { t, input } = await guestRating()
    await forceStatus(db, t.id, 'setup')
    expect(await saveGuestRating(db, input)).toEqual({ ok: false, reason: 'paused' })
    await forceStatus(db, t.id, 'finished')
    expect(await saveGuestRating(db, input)).toEqual({ ok: false, reason: 'finished' })
    expect(await db.select().from(ratings)).toEqual([])
  })

  it('stores nothing when the wine got another number since the page was rendered', async () => {
    const { t, wine, input } = await guestRating()
    await addWine(db, t.id, wineInput('Silvaner'))
    await moveWine(db, t.id, wine.id, 'down')
    expect(await saveGuestRating(db, input)).toEqual({ ok: false, reason: 'moved' })
    // Bound to the wine id: with the current number it lands on the same wine
    expect(await saveGuestRating(db, { ...input, shownPosition: 2 })).toEqual({ ok: true, position: 2, total: 2 })
    expect((await db.select().from(ratings)).map((r) => r.wineId)).toEqual([wine.id])
  })

  it('stores nothing for deleted wines or wines of another tasting', async () => {
    const { t, wine, input } = await guestRating()
    const other = await seedTasting(db, { preset: 'simple', status: 'active' })
    const foreign = await addWine(db, other.id, wineInput('Fremd'))
    expect(await saveGuestRating(db, { ...input, wineId: foreign.id })).toEqual({ ok: false, reason: 'wine_gone' })
    await forceStatus(db, t.id, 'setup')
    await deleteWine(db, t.id, wine.id)
    await forceStatus(db, t.id, 'active')
    expect(await saveGuestRating(db, input)).toEqual({ ok: false, reason: 'wine_gone' })
    expect(await db.select().from(ratings)).toEqual([])
  })

  it('checks under a lock on the tasting row, so a status change or reorder is waited for', async () => {
    // PGlite can't interleave transactions (that is checked against real Postgres): make sure the
    // transaction holds a lock on the tasting row, which setTastingStatus and the wine moves have to wait for.
    const { t, input } = await guestRating()
    expect(await locksTastingRow(db, t.id, (tx) => saveGuestRating(tx, input))).toBe(true)
  })
})
