export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('SESSION_SECRET must be set to at least 32 characters')
  }
  return secret
}
