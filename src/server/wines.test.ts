import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { forceStatus, seedTasting, wineInput } from '@/test/factories'
import { StructureLockedError } from './structure'
import type { Db } from '@/db/types'
import { addWine, deleteWine, getWineById, getWineByPosition, listWines, moveWine, updateWine } from './wines'

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
