import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { forceStatus, seedTasting } from '@/test/factories'
import { locksTastingRow } from '@/test/locks'
import type { Db } from '@/db/types'
import { StructureLockedError, assertStructureEditable } from './structure'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

it('locks the tasting row, so a concurrent status change is waited for instead of overtaken', async () => {
  // PGlite has one connection and can't interleave transactions – the race itself is checked against
  // real Postgres; here we make sure the check holds the row lock that setTastingStatus has to wait for.
  const t = await seedTasting(db)
  expect(await locksTastingRow(db, t.id, (tx) => assertStructureEditable(tx, t.id))).toBe(true)
})

it('refuses unless the tasting is in setup', async () => {
  const t = await seedTasting(db)
  await expect(assertStructureEditable(db, t.id)).resolves.toBeUndefined()
  for (const status of ['active', 'finished'] as const) {
    await forceStatus(db, t.id, status)
    await expect(assertStructureEditable(db, t.id)).rejects.toBeInstanceOf(StructureLockedError)
  }
  await expect(assertStructureEditable(db, '00000000-0000-4000-8000-000000000000')).rejects.toBeInstanceOf(
    StructureLockedError,
  )
})
