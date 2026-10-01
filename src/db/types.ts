import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type * as schema from './schema'

/** Gemeinsamer DB-Typ für postgres-js (Produktion) und PGlite (Tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>
