import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import type { Db } from '@/db/types'
import { tastings, wines } from '@/db/schema'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

async function insertTasting(code = 'ABCDEF') {
  const [t] = await db.insert(tastings).values({ code, name: 'T', adminPinHash: 'x' }).returning()
  return t
}

it('applies defaults to a new tasting', async () => {
  const t = await insertTasting()
  expect(t.status).toBe('setup')
  expect(t.blindTasting).toBe(false)
  expect(t.pinFailedAttempts).toBe(0)
})

it('rejects duplicate wine positions within a tasting', async () => {
  const t = await insertTasting()
  await db.insert(wines).values({ tastingId: t.id, position: 1, name: 'A' })
  await expect(db.insert(wines).values({ tastingId: t.id, position: 1, name: 'B' })).rejects.toThrow()
})

it('allows the same position in different tastings', async () => {
  const a = await insertTasting('AAAAAA')
  const b = await insertTasting('BBBBBB')
  await db.insert(wines).values({ tastingId: a.id, position: 1, name: 'A' })
  await expect(db.insert(wines).values({ tastingId: b.id, position: 1, name: 'B' })).resolves.toBeDefined()
})
