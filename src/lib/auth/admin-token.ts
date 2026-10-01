import { createHmac, timingSafeEqual } from 'node:crypto'

const sign = (payload: string, secret: string) => createHmac('sha256', secret).update(payload).digest()

/** Format: <tastingId>.<expiresAt ms>.<hmac base64url> */
export function signAdminToken(tastingId: string, expiresAt: Date, secret: string): string {
  const payload = `${tastingId}.${expiresAt.getTime()}`
  return `${payload}.${sign(payload, secret).toString('base64url')}`
}

export function verifyAdminToken(
  token: string,
  secret: string,
  now: Date = new Date(),
): { tastingId: string } | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  const [tastingId, expiresAt, signature] = parts
  const expected = sign(`${tastingId}.${expiresAt}`, secret)
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  if (!(Number(expiresAt) > now.getTime())) return null
  return { tastingId }
}
