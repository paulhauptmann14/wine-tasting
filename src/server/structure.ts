import { eq } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { tastings } from '@/db/schema'
import { STRUCTURE_LOCK_HINT, canEditStructure } from '@/lib/tasting/rules'

export class StructureLockedError extends Error {
  constructor() {
    super(STRUCTURE_LOCK_HINT)
    this.name = 'StructureLockedError'
  }
}

/**
 * Checked in the service so no caller can bypass the lock. Call inside the transaction that makes the change:
 * the tasting row stays locked until it ends, so a concurrent setTastingStatus (FOR UPDATE) either finishes
 * first – then this sees 'active' – or waits until the change is committed. FOR NO KEY UPDATE like
 * lockTasting in wines.ts: guests joining (FK checks, FOR KEY SHARE) are not blocked; a rating being
 * saved (saveGuestRating, FOR SHARE) is waited for.
 */
export async function assertStructureEditable(db: Db, tastingId: string): Promise<void> {
  const [tasting] = await db
    .select({ status: tastings.status })
    .from(tastings)
    .where(eq(tastings.id, tastingId))
    .for('no key update')
  if (!tasting || !canEditStructure(tasting.status)) throw new StructureLockedError()
}
