const FIRST_LOCK_MINUTES = 10
const MAX_LOCK_MINUTES = 24 * 60

/**
 * Lock duration for the n-th lockout in a row (1 = first): 10, 20, 40 … minutes, at most a day.
 * A typo costs 10 minutes once; trying all 10,000 four-digit PINs would take years.
 */
export function lockMinutes(lockNumber: number): number {
  const n = Math.max(1, Math.floor(lockNumber))
  return Math.min(FIRST_LOCK_MINUTES * 2 ** (n - 1), MAX_LOCK_MINUTES)
}

/** "10 Minuten", "1 Stunde", "24 Stunden" – rounded up so nobody retries too early. */
export function formatWait(minutes: number): string {
  if (minutes < 60) return minutes === 1 ? '1 Minute' : `${minutes} Minuten`
  const hours = Math.ceil(minutes / 60)
  return hours === 1 ? '1 Stunde' : `${hours} Stunden`
}
