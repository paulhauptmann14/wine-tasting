import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '@/db/schema'
import type { Db } from '@/db/types'

// One migrated instance per test file (vitest isolates modules per file), emptied before every
// test. Starting PGlite costs ~0.5 s and a clone ~0.1 s, a TRUNCATE a few milliseconds. The
// migrations seed no rows and all keys are UUIDs, so an emptied database equals a fresh one.
let instance: Promise<{ client: PGlite; db: Db; truncate: string | null }> | undefined

function migrated() {
  instance ??= (async () => {
    const client = new PGlite()
    await migrate(drizzle({ client }), { migrationsFolder: 'drizzle' })
    const { rows } = await client.query<{ name: string }>(
      `SELECT quote_ident(tablename) AS name FROM pg_tables WHERE schemaname = 'public'`,
    )
    const truncate = rows.length ? `TRUNCATE ${rows.map((r) => r.name).join(', ')} RESTART IDENTITY CASCADE` : null
    return { client, db: drizzle({ client, schema }) as unknown as Db, truncate }
  })()
  return instance
}

/** Empty in-memory Postgres with all migrations – call per test (in beforeEach). */
export async function createTestDb(): Promise<Db> {
  const { client, db, truncate } = await migrated()
  // A test that failed mid-transaction must not leave the next one inside it
  if (client.isInTransaction()) await client.exec('ROLLBACK')
  if (truncate) await client.exec(truncate)
  return db
}
