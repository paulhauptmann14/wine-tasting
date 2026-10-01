import { validateEnv } from '@/lib/env'

/** Läuft einmal beim Serverstart – fehlende Konfiguration fällt sofort auf, nicht erst beim ersten Login. */
export function register() {
  const errors = validateEnv(process.env)
  if (errors.length > 0) {
    throw new Error(`Ungültige Konfiguration: ${errors.join('; ')}`)
  }
}
