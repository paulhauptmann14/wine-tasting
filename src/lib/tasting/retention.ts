/** Tastings – with wines, guests, ratings and notes – are deleted this long after they were created (GDPR storage limitation). */
export const RETENTION_DAYS = 90

const RETENTION_MS = RETENTION_DAYS * 86_400_000

export const deletionDate = (createdAt: Date) => new Date(createdAt.getTime() + RETENTION_MS)

export const isExpired = (createdAt: Date, now: Date = new Date()) => now >= deletionDate(createdAt)

/** Tastings created at or before this moment are expired – the bulk form of isExpired(). */
export const retentionCutoff = (now: Date = new Date()) => new Date(now.getTime() - RETENTION_MS)
