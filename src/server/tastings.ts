import { and, eq, isNull, lt, lte, or, sql } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { ratingCriteria, sessions, tastings } from '@/db/schema'
import { generateCode, normalizeCode } from '@/lib/tasting/code'
import { PRESETS, type PresetKey } from '@/lib/tasting/presets'
import { hashPin, verifyPin } from '@/lib/auth/pin'
import { lockMinutes } from '@/lib/auth/pin-lockout'
import { isExpired, retentionCutoff } from '@/lib/tasting/retention'
import { canTransition, type TastingStatus } from '@/lib/tasting/rules'
import { countCriteria, presetCriteriaRows } from './criteria'
import { assertStructureEditable } from './structure'
import { countWines } from './wines'

export type Tasting = typeof tastings.$inferSelect

export const MAX_PIN_ATTEMPTS = 5
const CODE_ATTEMPTS = 5

export async function createTasting(
  db: Db,
  input: { name: string; description?: string | null; blindTasting: boolean; preset: PresetKey; pin: string },
): Promise<Tasting> {
  const adminPinHash = await hashPin(input.pin)
  await purgeExpired(db)
  return db.transaction(async (tx) => {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const [tasting] = await tx
        .insert(tastings)
        .values({
          code: generateCode(),
          name: input.name,
          description: input.description ?? null,
          blindTasting: input.blindTasting,
          scale: PRESETS[input.preset].scale,
          adminPinHash,
        })
        .onConflictDoNothing({ target: tastings.code })
        .returning()
      if (!tasting) continue
      await tx.insert(ratingCriteria).values(presetCriteriaRows(tasting.id, input.preset))
      return tasting
    }
    throw new Error('Could not generate a unique tasting code')
  })
}

export async function getTastingByCode(db: Db, code: string): Promise<Tasting | null> {
  const normalized = normalizeCode(code)
  if (!normalized) return null
  const [tasting] = await db.select().from(tastings).where(eq(tastings.code, normalized))
  if (!tasting) return null
  // Past the retention period it's gone – even if no cleanup has run yet
  if (isExpired(tasting.createdAt)) {
    await db.delete(tastings).where(eq(tastings.id, tasting.id))
    return null
  }
  return tasting
}

/**
 * Deletes tastings past the retention period (wines, guests, sessions, ratings follow via cascade)
 * and expired guest sessions. Runs daily via the cron route (/api/cron/purge) and, as a fallback
 * without a scheduler (e.g. Docker), whenever a tasting is created.
 */
export async function purgeExpired(db: Db, now: Date = new Date()): Promise<{ tastings: number; sessions: number }> {
  const deletedTastings = await db
    .delete(tastings)
    .where(lte(tastings.createdAt, retentionCutoff(now)))
    .returning({ id: tastings.id })
  const deletedSessions = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, now))
    .returning({ id: sessions.id })
  return { tastings: deletedTastings.length, sessions: deletedSessions.length }
}

type AdminLoginResult =
  | { ok: true; tasting: Tasting }
  | { ok: false; reason: 'not_found' | 'wrong_pin' }
  | { ok: false; reason: 'locked'; lockedUntil: Date }

export async function verifyAdminPin(
  db: Db,
  code: string,
  pin: string,
  now: Date = new Date(),
): Promise<AdminLoginResult> {
  const tasting = await getTastingByCode(db, code)
  if (!tasting) return { ok: false, reason: 'not_found' }
  const byId = eq(tastings.id, tasting.id)
  const lock = async () => {
    // Count the lockout atomically, then lock for as long as that number calls for
    const [{ lockCount }] = await db
      .update(tastings)
      .set({ pinFailedAttempts: 0, pinLockCount: sql`${tastings.pinLockCount} + 1` })
      .where(byId)
      .returning({ lockCount: tastings.pinLockCount })
    const lockedUntil = new Date(now.getTime() + lockMinutes(lockCount) * 60_000)
    await db.update(tastings).set({ pinLockedUntil: lockedUntil }).where(byId)
    return { ok: false, reason: 'locked', lockedUntil } as const
  }

  // Count the attempt atomically first: parallel requests never see the same counter value
  const [counted] = await db
    .update(tastings)
    .set({ pinFailedAttempts: sql`${tastings.pinFailedAttempts} + 1` })
    .where(and(byId, or(isNull(tastings.pinLockedUntil), lte(tastings.pinLockedUntil, now))))
    .returning({ attempts: tastings.pinFailedAttempts })

  if (!counted) {
    const [row] = await db.select({ lockedUntil: tastings.pinLockedUntil }).from(tastings).where(byId)
    return { ok: false, reason: 'locked', lockedUntil: row?.lockedUntil ?? now }
  }
  if (counted.attempts > MAX_PIN_ATTEMPTS) return lock()

  if (await verifyPin(pin, tasting.adminPinHash)) {
    await db.update(tastings).set({ pinFailedAttempts: 0, pinLockedUntil: null, pinLockCount: 0 }).where(byId)
    return { ok: true, tasting }
  }
  if (counted.attempts >= MAX_PIN_ATTEMPTS) return lock()
  return { ok: false, reason: 'wrong_pin' }
}

/** Name and description – always editable, they reveal nothing about the wines. */
export async function updateTastingDetails(
  db: Db,
  tastingId: string,
  details: { name: string; description: string | null },
): Promise<void> {
  await db
    .update(tastings)
    .set({ name: details.name, description: details.description })
    .where(eq(tastings.id, tastingId))
}

/** Setup only (StructureLockedError otherwise) – switching later would reveal or re-hide names mid-tasting. */
export async function setBlindTasting(db: Db, tastingId: string, blindTasting: boolean): Promise<void> {
  await db.transaction(async (tx) => {
    await assertStructureEditable(tx, tastingId)
    await tx.update(tastings).set({ blindTasting }).where(eq(tastings.id, tastingId))
  })
}

export async function setTastingStatus(
  db: Db,
  tastingId: string,
  to: TastingStatus,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return db.transaction(async (tx) => {
    const [tasting] = await tx.select().from(tastings).where(eq(tastings.id, tastingId)).for('update')
    if (!tasting) return { ok: false, reason: 'Tasting nicht gefunden.' } as const
    const check = canTransition(tasting.status, to, {
      wineCount: await countWines(tx, tastingId),
      criteriaCount: await countCriteria(tx, tastingId),
    })
    if (!check.ok) return check
    await tx.update(tastings).set({ status: to }).where(eq(tastings.id, tastingId))
    return { ok: true } as const
  })
}

/** Deletes the tasting; wines, guests, sessions, criteria and ratings go away via cascade. */
export async function deleteTasting(db: Db, tastingId: string): Promise<void> {
  await db.delete(tastings).where(eq(tastings.id, tastingId))
}
