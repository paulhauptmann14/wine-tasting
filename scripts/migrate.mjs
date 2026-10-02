// Wendet alle Migrationen aus ./drizzle an – im Docker-Setup (Raspberry Pi) und gegen Supabase.
// Ohne drizzle-kit, damit es auch in schlanken Umgebungen läuft.
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'

const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL
if (!url) {
  console.error('DATABASE_URL fehlt')
  process.exit(1)
}

const client = postgres(url, { max: 1 })
try {
  await migrate(drizzle({ client }), { migrationsFolder: 'drizzle' })
  console.log('Migrationen angewendet')
} finally {
  await client.end()
}
