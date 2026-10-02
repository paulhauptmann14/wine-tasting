import { validateEnv } from '@/lib/env'

/** Runs once at server start – missing configuration shows up immediately, not at the first login. */
export function register() {
  const errors = validateEnv(process.env)
  if (errors.length > 0) {
    throw new Error(`Ungültige Konfiguration: ${errors.join('; ')}`)
  }
}
