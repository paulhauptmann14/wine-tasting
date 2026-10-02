import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type * as schema from './schema'

/** Shared DB type for postgres-js (production) and PGlite (tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>
