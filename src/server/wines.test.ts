import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import { StructureLockedError } from './structure'
import type { Db } from '@/db/types'
import { eq } from 'drizzle-orm'
import { tastings } from '@/db/schema'
import { addWine, deleteWine, getWineById, getWineByPosition, listWines, moveWine, updateWine } from './wines'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})
const w = (name: string) => ({ name, vintage: null, grapeVariety: null, sweetness: null, wineType: null })
const names = async (tastingId: string) =>
  (await listWines(db, tastingId)).map((x) => `${x.position}:${x.name}`)

it('numbers wines automatically', async () => {
  const t = await seedTasting(db)
  await addWine(db, t.id, w('A'))
  await addWine(db, t.id, w('B'))
  await addWine(db, t.id, { name: 'C', vintage: 2022, grapeVariety: 'Riesling', sweetness: null, wineType: null })
  expect(await names(t.id)).toEqual(['1:A', '2:B', '3:C'])
  expect(await getWineByPosition(db, t.id, 3)).toMatchObject({ name: 'C', vintage: 2022, grapeVariety: 'Riesling', sweetness: null, wineType: null })
  expect(await getWineByPosition(db, t.id, 4)).toBeNull()
})

it('closes gaps after deleting', async () => {
  const t = await seedTasting(db)
  await addWine(db, t.id, w('A'))
  const b = await addWine(db, t.id, w('B'))
  await addWine(db, t.id, w('C'))
  await deleteWine(db, t.id, b.id)
  expect(await names(t.id)).toEqual(['1:A', '2:C'])
})

it('moves wines up and down and ignores moves past the edges', async () => {
  const t = await seedTasting(db)
  const a = await addWine(db, t.id, w('A'))
  await addWine(db, t.id, w('B'))
  const c = await addWine(db, t.id, w('C'))
  await moveWine(db, t.id, c.id, 'up')
  expect(await names(t.id)).toEqual(['1:A', '2:C', '3:B'])
  await moveWine(db, t.id, a.id, 'up')
  await moveWine(db, t.id, a.id, 'down')
  expect(await names(t.id)).toEqual(['1:C', '2:A', '3:B'])
})

it('only touches wines of the given tasting', async () => {
  const t = await seedTasting(db)
  const other = await seedTasting(db)
  const a = await addWine(db, t.id, w('A'))
  await updateWine(db, other.id, a.id, w('Hacked'))
  await deleteWine(db, other.id, a.id)
  expect(await names(t.id)).toEqual(['1:A'])
  await updateWine(db, t.id, a.id, { name: 'A2', vintage: 2020, grapeVariety: null, sweetness: null, wineType: null })
  expect(await names(t.id)).toEqual(['1:A2'])
})

it('finds a wine by id only within its tasting', async () => {
  const t = await seedTasting(db)
  const other = await seedTasting(db)
  const a = await addWine(db, t.id, w('A'))
  expect(await getWineById(db, t.id, a.id)).toMatchObject({ name: 'A', position: 1 })
  expect(await getWineById(db, other.id, a.id)).toBeNull()
})

it('refuses to delete or move wines once the tasting has started', async () => {
  const t = await seedTasting(db)
  const a = await addWine(db, t.id, w('A'))
  await addWine(db, t.id, w('B'))
  const active = await seedTastingStatus(t.id, 'active')
  await expect(deleteWine(db, active, a.id)).rejects.toThrow(StructureLockedError)
  await expect(moveWine(db, active, a.id, 'down')).rejects.toThrow(StructureLockedError)
  // Hinzufügen und Bearbeiten bleiben erlaubt
  await addWine(db, active, w('C'))
  await updateWine(db, active, a.id, w('A2'))
  expect(await names(t.id)).toEqual(['1:A2', '2:B', '3:C'])
})

async function seedTastingStatus(tastingId: string, status: 'active' | 'finished') {
  await db.update(tastings).set({ status }).where(eq(tastings.id, tastingId))
  return tastingId
}
