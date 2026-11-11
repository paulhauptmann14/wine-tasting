import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import type { Db } from '@/db/types'
import { participants, ratingValues, ratings, wines } from '@/db/schema'
import { PRESETS } from '@/lib/tasting/presets'
import { StructureLockedError } from './structure'
import { addCriterion, deleteCriterion, listCriteria, moveCriterion, renameCriterion } from './criteria'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})
const names = async (tastingId: string) =>
  (await listCriteria(db, tastingId)).map((c) => `${c.position}:${c.name}`)

it('appends, renames and reorders criteria', async () => {
  const t = await seedTasting(db, { preset: 'simple' })
  const finish = await addCriterion(db, t.id, 'Abgang')
  expect(finish).toMatchObject({ scaleMin: 1, scaleMax: 5 })
  await renameCriterion(db, t.id, finish.id, 'Nachhall')
  await moveCriterion(db, t.id, finish.id, 'up')
  expect(await names(t.id)).toEqual(['1:Nachhall', '2:Gesamt'])
})

it('deletes a criterion with its rating values and renumbers', async () => {
  const t = await seedTasting(db, { preset: 'hundred' })
  const [aussehen, geruch] = await listCriteria(db, t.id)
  const [wine] = await db.insert(wines).values({ tastingId: t.id, position: 1, name: 'R' }).returning()
  const [p] = await db.insert(participants).values({ tastingId: t.id, name: 'P' }).returning()
  const [r] = await db.insert(ratings).values({ participantId: p.id, wineId: wine.id }).returning()
  await db.insert(ratingValues).values([
    { ratingId: r.id, criterionId: aussehen.id, value: 4 },
    { ratingId: r.id, criterionId: geruch.id, value: 5 },
  ])
  expect(await deleteCriterion(db, t.id, aussehen.id)).toEqual({ ok: true })
  expect(await names(t.id)).toEqual(PRESETS.hundred.criteria.slice(1).map((c, i) => `${i + 1}:${c.name}`))
  expect((await db.select().from(ratingValues)).map((v) => v.criterionId)).toEqual([geruch.id])
})

it('refuses to delete the last criterion', async () => {
  const t = await seedTasting(db, { preset: 'simple' })
  const [only] = await listCriteria(db, t.id)
  expect(await deleteCriterion(db, t.id, only.id)).toEqual({
    ok: false, reason: 'Mindestens ein Kriterium wird gebraucht.',
  })
})

it('only touches criteria of the given tasting', async () => {
  const t = await seedTasting(db, { preset: 'simple' })
  const other = await seedTasting(db, { preset: 'simple' })
  const extra = await addCriterion(db, t.id, 'Abgang')
  await renameCriterion(db, other.id, extra.id, 'Hacked')
  await deleteCriterion(db, other.id, extra.id)
  expect(await names(t.id)).toEqual(['1:Gesamt', '2:Abgang'])
})

it('refuses to add, delete or move criteria once the tasting has started', async () => {
  const t = await seedTasting(db, { preset: 'hundred', status: 'active' })
  const [first] = await listCriteria(db, t.id)
  await expect(addCriterion(db, t.id, 'Abgang')).rejects.toThrow(StructureLockedError)
  await expect(deleteCriterion(db, t.id, first.id)).rejects.toThrow(StructureLockedError)
  await expect(moveCriterion(db, t.id, first.id, 'down')).rejects.toThrow(StructureLockedError)
  // Renaming stays allowed
  await renameCriterion(db, t.id, first.id, 'Optik')
  expect((await listCriteria(db, t.id)).map((c) => c.name)).toEqual([
    'Optik',
    ...PRESETS.hundred.criteria.slice(1).map((c) => c.name),
  ])
})
