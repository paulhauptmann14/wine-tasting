import { beforeEach, expect, it } from 'vitest'
import { sql } from 'drizzle-orm'
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

it('indexes every foreign key column, so lookups and cascading deletes need no full table scan', async () => {
  // Postgres creates no index for a foreign key; without one, deleting a parent row scans the child table
  const result = await db.execute(sql`
    select c.conrelid::regclass::text as "table", a.attname as "column"
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f'
      and not exists (
        select 1 from pg_index i where i.indrelid = c.conrelid and i.indkey[0] = c.conkey[1]
      )
    order by 1, 2
  `)
  expect((result as unknown as { rows: unknown[] }).rows).toEqual([])
})

it('indexes tasting.created_at for the daily clean-up', async () => {
  const result = await db.execute(sql`
    select 1 from pg_index i
    join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
    where i.indrelid = 'tasting'::regclass and a.attname = 'created_at'
  `)
  expect((result as unknown as { rows: unknown[] }).rows).toHaveLength(1)
})
