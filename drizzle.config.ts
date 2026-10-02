import { config } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

config({ path: '.env.local' })

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // For Supabase migrations, point MIGRATION_DATABASE_URL at the session pooler (see README)
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
})
