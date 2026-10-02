import 'server-only'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'
import type { Db } from './types'

const globalForDb = globalThis as unknown as { pgClient?: ReturnType<typeof postgres> }

// prepare: false – the Supabase transaction pooler doesn't support prepared statements
const client = globalForDb.pgClient ?? postgres(process.env.DATABASE_URL!, { prepare: false })
if (process.env.NODE_ENV !== 'production') globalForDb.pgClient = client

export const db = drizzle({ client, schema }) as unknown as Db
