type EnvInput = Record<string, string | undefined>

const MIN_SESSION_SECRET_LENGTH = 32

/** Returns all configuration errors; empty means everything is fine. */
export function validateEnv(env: EnvInput): string[] {
  const errors: string[] = []
  if (!env.DATABASE_URL) errors.push('DATABASE_URL fehlt')
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < MIN_SESSION_SECRET_LENGTH) {
    errors.push('SESSION_SECRET muss mindestens 32 Zeichen lang sein')
  }
  return errors
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < MIN_SESSION_SECRET_LENGTH) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters')
  }
  return secret
}
