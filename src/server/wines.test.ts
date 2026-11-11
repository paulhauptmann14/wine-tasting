import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { forceStatus, seedTasting, wineInput } from '@/test/factories'
import { StructureLockedError } from './structure'
import type { Db } from '@/db/types'
import { joinTasting } from './participants'
import { listCriteria } from './criteria'
import { getRating, saveRating } from './ratings'
import { participants } from '@/db/schema'
import { eq } from 'drizzle-orm'
import {
  addWine,
  deleteWine,
  getWineById,
  getWineByPosition,
  listWines,
  moveWine,
  ratedWineIds,
  shuffleWines,
  updateWine,
} from './wines'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})
const names = async (tastingId: string) =>
  (await listWines(db, tastingId)).map((x) => `${x.position}:${x.name}`)

it('numbers wines automatically', async () => {
  const t = await seedTasting(db)
  await addWine(db, t.id, wineInput('A'))
  await addWine(db, t.id, wineInput('B'))
  await addWine(db, t.id, wineInput('C', { vintage: 2022, grapeVariety: 'Riesling' }))
  expect(await names(t.id)).toEqual(['1:A', '2:B', '3:C'])
  expect(await getWineByPosition(db, t.id, 3)).toMatchObject(wineInput('C', { vintage: 2022, grapeVariety: 'Riesling' }))
  expect(await getWineByPosition(db, t.id, 4)).toBeNull()
})

it('closes gaps after deleting', async () => {
  const t = await seedTasting(db)
  await addWine(db, t.id, wineInput('A'))
  const b = await addWine(db, t.id, wineInput('B'))
  await addWine(db, t.id, wineInput('C'))
  await deleteWine(db, t.id, b.id)
  expect(await names(t.id)).toEqual(['1:A', '2:C'])
})

it('moves wines up and down and ignores moves past the edges', async () => {
  const t = await seedTasting(db)
  const a = await addWine(db, t.id, wineInput('A'))
  await addWine(db, t.id, wineInput('B'))
  const c = await addWine(db, t.id, wineInput('C'))
  await moveWine(db, t.id, c.id, 'up')
  expect(await names(t.id)).toEqual(['1:A', '2:C', '3:B'])
  await moveWine(db, t.id, a.id, 'up')
  await moveWine(db, t.id, a.id, 'down')
  expect(await names(t.id)).toEqual(['1:C', '2:A', '3:B'])
})

it('only touches wines of the given tasting', async () => {
  const t = await seedTasting(db)
  const other = await seedTasting(db)
  const a = await addWine(db, t.id, wineInput('A'))
  await updateWine(db, other.id, a.id, wineInput('Hacked'))
  await deleteWine(db, other.id, a.id)
  expect(await names(t.id)).toEqual(['1:A'])
  await updateWine(db, t.id, a.id, wineInput('A2', { vintage: 2020 }))
  expect(await names(t.id)).toEqual(['1:A2'])
})

it('finds a wine by id only within its tasting', async () => {
  const t = await seedTasting(db)
  const other = await seedTasting(db)
  const a = await addWine(db, t.id, wineInput('A'))
  expect(await getWineById(db, t.id, a.id)).toMatchObject({ name: 'A', position: 1 })
  expect(await getWineById(db, other.id, a.id)).toBeNull()
})

it('refuses to delete wines once the tasting has started', async () => {
  const t = await seedTasting(db)
  const a = await addWine(db, t.id, wineInput('A'))
  await addWine(db, t.id, wineInput('B'))
  await forceStatus(db, t.id, 'active')
  await expect(deleteWine(db, t.id, a.id)).rejects.toThrow(StructureLockedError)
  // Adding and editing stay allowed
  await addWine(db, t.id, wineInput('C'))
  await updateWine(db, t.id, a.id, wineInput('A2'))
  expect(await names(t.id)).toEqual(['1:A2', '2:B', '3:C'])
})

it('reorders wines while the tasting runs – the order follows what is poured', async () => {
  const t = await seedTasting(db)
  const a = await addWine(db, t.id, wineInput('A'))
  await addWine(db, t.id, wineInput('B'))
  await forceStatus(db, t.id, 'active')
  await moveWine(db, t.id, a.id, 'down')
  expect(await names(t.id)).toEqual(['1:B', '2:A'])
  await forceStatus(db, t.id, 'finished')
  await moveWine(db, t.id, a.id, 'up')
  expect(await names(t.id)).toEqual(['1:A', '2:B'])
})

describe('shuffleWines', () => {
  /** Always picks index 0 – with Fisher–Yates this gives a fixed, non-trivial permutation. */
  const lowest = () => 0

  async function seedWines(status: 'setup' | 'active' | 'finished', wineNames: string[]) {
    const t = await seedTasting(db, { preset: 'simple', status })
    const created = []
    for (const name of wineNames) created.push(await addWine(db, t.id, wineInput(name)))
    return { t, created }
  }

  async function rate(tastingId: string, wineId: string, guest = 'Anna') {
    const [criterion] = await listCriteria(db, tastingId)
    const { participant } = await joinTasting(db, tastingId, guest)
    await saveRating(db, { participantId: participant.id, wineId, values: { [criterion.id]: 4 }, notes: null })
  }

  it('shuffles everything during setup and keeps the numbering gapless', async () => {
    const { t } = await seedWines('setup', ['A', 'B', 'C', 'D'])
    expect(await shuffleWines(db, t.id, lowest)).toEqual({ ok: true, shuffled: 4, order: ['B', 'C', 'D', 'A'] })
    expect(await names(t.id)).toEqual(['1:B', '2:C', '3:D', '4:A'])
  })

  it('always changes the order, even if the random source would keep it', async () => {
    const { t } = await seedWines('setup', ['A', 'B', 'C'])
    expect(await shuffleWines(db, t.id, (max) => max - 1)).toMatchObject({ ok: true, shuffled: 3 })
    const after = await names(t.id)
    expect(after).not.toEqual(['1:A', '2:B', '3:C'])
    expect(after.map((n) => n.split(':')[0])).toEqual(['1', '2', '3'])
    expect(after.map((n) => n.split(':')[1]).sort()).toEqual(['A', 'B', 'C'])
  })

  it('works with the real random source', async () => {
    const { t } = await seedWines('setup', ['A', 'B', 'C', 'D', 'E'])
    expect(await shuffleWines(db, t.id)).toMatchObject({ ok: true, shuffled: 5 })
    const after = await listWines(db, t.id)
    expect(after.map((w) => w.position)).toEqual([1, 2, 3, 4, 5])
    expect(after.map((w) => w.name).join('')).not.toBe('ABCDE')
  })

  it('keeps rated wines in place and moves only the unrated ones while the tasting runs', async () => {
    const { t, created } = await seedWines('active', ['A', 'B', 'C', 'D', 'E'])
    await rate(t.id, created[1].id)
    await rate(t.id, created[3].id)
    expect(await shuffleWines(db, t.id, lowest)).toEqual({ ok: true, shuffled: 3, order: ['C', 'B', 'E', 'D', 'A'] })
    expect(await names(t.id)).toEqual(['1:C', '2:B', '3:E', '4:D', '5:A'])
  })

  it('counts a wine as rated as soon as one guest rated it', async () => {
    const { t, created } = await seedWines('active', ['A', 'B', 'C'])
    await rate(t.id, created[0].id, 'Anna')
    await rate(t.id, created[0].id, 'Ben')
    expect(await shuffleWines(db, t.id, lowest)).toMatchObject({ ok: true, shuffled: 2 })
    expect(await names(t.id)).toEqual(['1:A', '2:C', '3:B'])
  })

  it('keeps ratings attached to their wine and its position fixed', async () => {
    const { t, created } = await seedWines('active', ['A', 'B', 'C'])
    await rate(t.id, created[0].id)
    const [criterion] = await listCriteria(db, t.id)
    const [participant] = await db.select().from(participants).where(eq(participants.tastingId, t.id))
    const before = await getRating(db, participant.id, created[0].id)
    await shuffleWines(db, t.id, lowest)
    expect(await getRating(db, participant.id, created[0].id)).toEqual(before)
    expect(before?.values[criterion.id]).toBe(4)
    expect((await getWineById(db, t.id, created[0].id))?.position).toBe(1)
  })

  it('keeps a rated wine in place when the tasting went back to setup', async () => {
    const { t, created } = await seedWines('active', ['A', 'B', 'C'])
    await rate(t.id, created[0].id)
    await forceStatus(db, t.id, 'setup')
    expect(await shuffleWines(db, t.id, lowest)).toMatchObject({ ok: true, shuffled: 2 })
    expect(await names(t.id)).toEqual(['1:A', '2:C', '3:B'])
  })

  it('runs concurrently with deleteWine without breaking the numbering', async () => {
    const { t, created } = await seedWines('setup', ['A', 'B', 'C', 'D'])
    await Promise.all([deleteWine(db, t.id, created[1].id), shuffleWines(db, t.id, lowest)])
    expect((await listWines(db, t.id)).map((w) => w.position)).toEqual([1, 2, 3])
  })

  it('does nothing with fewer than two unrated wines', async () => {
    const { t, created } = await seedWines('active', ['A', 'B', 'C'])
    await rate(t.id, created[0].id)
    await rate(t.id, created[1].id)
    expect(await shuffleWines(db, t.id, lowest)).toMatchObject({ ok: true, shuffled: 0 })
    expect(await names(t.id)).toEqual(['1:A', '2:B', '3:C'])

    const single = await seedWines('setup', ['X'])
    expect(await shuffleWines(db, single.t.id, lowest)).toEqual({ ok: true, shuffled: 0, order: [] })
    const empty = await seedTasting(db)
    expect(await shuffleWines(db, empty.id, lowest)).toMatchObject({ ok: true, shuffled: 0 })
  })

  it('refuses once the tasting is finished', async () => {
    const { t } = await seedWines('finished', ['A', 'B', 'C'])
    expect(await shuffleWines(db, t.id, lowest)).toMatchObject({ ok: false })
    expect(await names(t.id)).toEqual(['1:A', '2:B', '3:C'])
  })

  it('refuses for an unknown tasting', async () => {
    expect(await shuffleWines(db, '00000000-0000-4000-8000-000000000000', lowest)).toMatchObject({ ok: false })
  })

  it('only touches wines of the given tasting', async () => {
    const { t } = await seedWines('setup', ['A', 'B', 'C'])
    const other = await seedWines('setup', ['X', 'Y', 'Z'])
    await shuffleWines(db, t.id, lowest)
    expect(await names(other.t.id)).toEqual(['1:X', '2:Y', '3:Z'])
  })

  it('does not count ratings of another tasting', async () => {
    const { t } = await seedWines('active', ['A', 'B'])
    const other = await seedWines('active', ['X', 'Y'])
    await rate(other.t.id, other.created[0].id)
    expect(await shuffleWines(db, t.id, lowest)).toMatchObject({ ok: true, shuffled: 2 })
    expect(await names(t.id)).toEqual(['1:B', '2:A'])
  })
})

describe('ratedWineIds', () => {
  it('lists the wines of the tasting that have at least one rating', async () => {
    const t = await seedTasting(db, { preset: 'simple', status: 'active' })
    const other = await seedTasting(db, { preset: 'simple', status: 'active' })
    const a = await addWine(db, t.id, wineInput('A'))
    await addWine(db, t.id, wineInput('B'))
    const x = await addWine(db, other.id, wineInput('X'))
    const [criterion] = await listCriteria(db, t.id)
    const [otherCriterion] = await listCriteria(db, other.id)
    const anna = (await joinTasting(db, t.id, 'Anna')).participant
    const ben = (await joinTasting(db, other.id, 'Ben')).participant
    await saveRating(db, { participantId: anna.id, wineId: a.id, values: { [criterion.id]: 3 }, notes: null })
    await saveRating(db, { participantId: ben.id, wineId: x.id, values: { [otherCriterion.id]: 3 }, notes: null })
    expect(await ratedWineIds(db, t.id)).toEqual(new Set([a.id]))
    expect(await ratedWineIds(db, other.id)).toEqual(new Set([x.id]))
  })
})
