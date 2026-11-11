/** Tastings – with wines, guests, ratings and notes – are deleted this long after they were created (GDPR storage limitation). */
export const RETENTION_DAYS = 90

const DAY_MS = 86_400_000

export const deletionDate = (createdAt: Date) => new Date(createdAt.getTime() + RETENTION_DAYS * DAY_MS)

export const isExpired = (createdAt: Date, now: Date = new Date()) => now >= deletionDate(createdAt)
