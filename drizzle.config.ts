import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // Für Supabase-Migrationen MIGRATION_DATABASE_URL auf den Session-Pooler setzen (siehe README)
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
})
