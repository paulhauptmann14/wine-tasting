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

/** Checked in the service so no caller can bypass the lock. */
export async function assertStructureEditable(db: Db, tastingId: string): Promise<void> {
  const [tasting] = await db.select({ status: tastings.status }).from(tastings).where(eq(tastings.id, tastingId))
  if (!tasting || !canEditStructure(tasting.status)) throw new StructureLockedError()
}
