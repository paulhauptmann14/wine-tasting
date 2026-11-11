import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import type { Db } from '@/db/types'
import { participants, ratingValues, ratings, tastings, wines } from '@/db/schema'
import { PRESETS } from '@/lib/tasting/presets'
import { StructureLockedError } from './structure'
import {
  addCriterion,
  applyPreset,
  countTastingRatings,
  deleteCriterion,
  listCriteria,
  moveCriterion,
  renameCriterion,
} from './criteria'

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

const addRating = async (tastingId: string) => {
  const [wine] = await db.insert(wines).values({ tastingId, position: 1, name: 'R' }).returning()
  const [p] = await db.insert(participants).values({ tastingId, name: 'P' }).returning()
  await db.insert(ratings).values({ participantId: p.id, wineId: wine.id })
}
const scaleOf = async (tastingId: string) =>
  (await db.select({ scale: tastings.scale }).from(tastings).where(eq(tastings.id, tastingId)))[0].scale
const presetNames = (key: keyof typeof PRESETS) => PRESETS[key].criteria.map((c, i) => `${i + 1}:${c.name}`)

describe('applyPreset', () => {
  it('replaces scale and criteria with the preset (gapless positions, weights copied)', async () => {
    const t = await seedTasting(db, { preset: 'simple' })
    await addCriterion(db, t.id, 'Abgang')
    expect(await applyPreset(db, t.id, 'hundred')).toEqual({ ok: true })
    expect(await scaleOf(t.id)).toBe('hundred')
    expect((await listCriteria(db, t.id)).map((c) => [c.position, c.name, c.weight])).toEqual(
      PRESETS.hundred.criteria.map((c, i) => [i + 1, c.name, c.weight]),
    )
  })

  it('switches between presets that share a scale', async () => {
    const t = await seedTasting(db, { preset: 'five' })
    expect(await applyPreset(db, t.id, 'simple')).toEqual({ ok: true })
    expect(await names(t.id)).toEqual(['1:Gesamt'])
    expect(await scaleOf(t.id)).toBe('five')
  })

  it('refuses once the tasting has started', async () => {
    const t = await seedTasting(db, { preset: 'five', status: 'active' })
    await expect(applyPreset(db, t.id, 'hundred')).rejects.toThrow(StructureLockedError)
    expect(await scaleOf(t.id)).toBe('five')
    expect(await names(t.id)).toEqual(presetNames('five'))
  })

  it('refuses when ratings exist (tasting went back to setup) and keeps everything', async () => {
    const t = await seedTasting(db, { preset: 'five' })
    await addRating(t.id)
    const result = await applyPreset(db, t.id, 'hundred')
    expect(result).toMatchObject({ ok: false })
    expect(result.ok === false && result.reason).toMatch(/Bewertungen/)
    expect(await scaleOf(t.id)).toBe('five')
    expect(await names(t.id)).toEqual(presetNames('five'))
  })

  it('leaves other tastings untouched', async () => {
    const t = await seedTasting(db, { preset: 'five' })
    const other = await seedTasting(db, { preset: 'twenty' })
    await addRating(other.id)
    await applyPreset(db, t.id, 'simple')
    expect(await scaleOf(other.id)).toBe('twenty')
    expect(await names(other.id)).toEqual(presetNames('twenty'))
  })

  it('refuses an unknown tasting', async () => {
    await expect(applyPreset(db, '00000000-0000-0000-0000-000000000000', 'simple')).rejects.toThrow(
      StructureLockedError,
    )
  })
})

it('counts the ratings of one tasting only', async () => {
  const t = await seedTasting(db, { preset: 'five' })
  const other = await seedTasting(db, { preset: 'five' })
  await addRating(other.id)
  expect(await countTastingRatings(db, t.id)).toBe(0)
  await addRating(t.id)
  expect(await countTastingRatings(db, t.id)).toBe(1)
})
