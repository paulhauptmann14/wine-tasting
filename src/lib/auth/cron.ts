import { createHash, timingSafeEqual } from 'node:crypto'

/** Vercel recommends at least 16 characters; shorter values count as "not configured". */
const MIN_SECRET_LENGTH = 16

const digest = (value: string) => createHash('sha256').update(value).digest()

/**
 * Checks the `Authorization: Bearer <CRON_SECRET>` header that Vercel Cron sends.
 * Closed without a configured secret, compared in constant time (hashes have equal length).
 */
export function isAuthorizedCron(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < MIN_SECRET_LENGTH || !header) return false
  return timingSafeEqual(digest(header), digest(`Bearer ${secret}`))
}
