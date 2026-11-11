import { defineConfig } from 'drizzle-kit'

try {
  process.loadEnvFile('.env.local')
} catch (error) {
  // Without .env.local (e.g. in CI) the variables come from the environment
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema.ts',
  out: './drizzle',
  dbCredentials: {
    // For Supabase migrations, point MIGRATION_DATABASE_URL at the session pooler (see DEPLOYMENT.md)
    url: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL!,
  },
})
