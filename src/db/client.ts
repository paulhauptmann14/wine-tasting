import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import type { Db } from './types'

// One pool per process, also in production: the bundler can put this module into several server chunks
// (pages and route handlers), each with its own module instance – without the cache on globalThis every
// copy would open its own pool. In development it also survives hot reloads.
const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> }

// prepare: false – the Supabase transaction pooler doesn't support prepared statements
const client = (globalForDb.pgClient ??= postgres(process.env.DATABASE_URL!, { prepare: false }))

export const db = drizzle({ client, schema }) as unknown as Db
