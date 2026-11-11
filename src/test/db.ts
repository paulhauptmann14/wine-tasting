import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { migrate } from 'drizzle-orm/pglite/migrator'
import * as schema from '@/db/schema'
import type { Db } from '@/db/types'

// Migrated once per test file (vitest isolates modules per file), then cloned for every test
let template: Promise<PGlite> | undefined
function migratedTemplate(): Promise<PGlite> {
  template ??= (async () => {
    const client = new PGlite()
    await migrate(drizzle({ client }), { migrationsFolder: 'drizzle' })
    return client
  })()
  return template
}

/** Fresh in-memory Postgres with all migrations – call per test. */
export async function createTestDb(): Promise<Db> {
  // clone() is typed as the interface, but returns a full PGlite instance
  const client = (await (await migratedTemplate()).clone()) as PGlite
  return drizzle({ client, schema }) as unknown as Db
}
