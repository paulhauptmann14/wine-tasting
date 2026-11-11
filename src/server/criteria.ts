import { and, asc, count, eq, max } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { participants, ratingCriteria, ratings, tastings } from '@/db/schema'
import { moveInOrder } from '@/lib/tasting/order'
import { PRESETS, type PresetKey } from '@/lib/tasting/presets'
import { canEditStructure } from '@/lib/tasting/rules'
import type { Direction } from '@/lib/validation'
import { StructureLockedError, assertStructureEditable } from './structure'

export type Criterion = typeof ratingCriteria.$inferSelect

const scoped = (tastingId: string, criterionId: string) =>
  and(eq(ratingCriteria.id, criterionId), eq(ratingCriteria.tastingId, tastingId))

export async function listCriteria(db: Db, tastingId: string): Promise<Criterion[]> {
  return db
    .select()
    .from(ratingCriteria)
    .where(eq(ratingCriteria.tastingId, tastingId))
    .orderBy(asc(ratingCriteria.position))
}

export async function countCriteria(db: Db, tastingId: string): Promise<number> {
  return db.$count(ratingCriteria, eq(ratingCriteria.tastingId, tastingId))
}

/** The criteria rows of a preset for one tasting (names, weights, positions 1..n). */
export const presetCriteriaRows = (tastingId: string, preset: PresetKey) =>
  PRESETS[preset].criteria.map(({ name, weight }, i) => ({ tastingId, name, weight, position: i + 1 }))

export async function countTastingRatings(db: Db, tastingId: string): Promise<number> {
  const [row] = await db
    .select({ n: count() })
    .from(ratings)
    .innerJoin(participants, eq(ratings.participantId, participants.id))
    .where(eq(participants.tastingId, tastingId))
  return row.n
}

/**
 * Switches the rating system: sets the scale and replaces ALL criteria with the preset's.
 * Setup only (StructureLockedError otherwise) and only while nobody has rated – replacing the
 * criteria would delete rating values via cascade. Check and change share one transaction
 * with the tasting row locked, so a concurrent status change is serialized. Known gap: rating
 * writes don't take that lock, so a rating that is still uncommitted while this runs is not seen.
 */
export async function applyPreset(
  db: Db,
  tastingId: string,
  preset: PresetKey,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return db.transaction(async (tx) => {
    const [tasting] = await tx
      .select({ status: tastings.status })
      .from(tastings)
      .where(eq(tastings.id, tastingId))
      .for('update')
    if (!tasting || !canEditStructure(tasting.status)) throw new StructureLockedError()
    if ((await countTastingRatings(tx, tastingId)) > 0) {
      return {
        ok: false,
        reason: 'Es gibt schon Bewertungen. Das Bewertungssystem lässt sich nur ändern, solange noch niemand bewertet hat.',
      } as const
    }
    await tx.update(tastings).set({ scale: PRESETS[preset].scale }).where(eq(tastings.id, tastingId))
    await tx.delete(ratingCriteria).where(eq(ratingCriteria.tastingId, tastingId))
    await tx.insert(ratingCriteria).values(presetCriteriaRows(tastingId, preset))
    return { ok: true } as const
  })
}

export async function addCriterion(db: Db, tastingId: string, name: string): Promise<Criterion> {
  return db.transaction(async (tx) => {
    await assertStructureEditable(tx, tastingId)
    const [{ last }] = await tx
      .select({ last: max(ratingCriteria.position) })
      .from(ratingCriteria)
      .where(eq(ratingCriteria.tastingId, tastingId))
    const [criterion] = await tx
      .insert(ratingCriteria)
      .values({ tastingId, name, position: (last ?? 0) + 1 })
      .returning()
    return criterion
  })
}

export async function renameCriterion(db: Db, tastingId: string, criterionId: string, name: string) {
  await db.update(ratingCriteria).set({ name }).where(scoped(tastingId, criterionId))
}

async function renumber(tx: Db, orderedIds: string[]) {
  for (const [i, id] of orderedIds.entries()) {
    await tx.update(ratingCriteria).set({ position: i + 1 }).where(eq(ratingCriteria.id, id))
  }
}

export async function deleteCriterion(
  db: Db,
  tastingId: string,
  criterionId: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  return db.transaction(async (tx) => {
    await assertStructureEditable(tx, tastingId)
    const ids = (await listCriteria(tx, tastingId)).map((c) => c.id)
    if (!ids.includes(criterionId)) return { ok: true } as const
    if (ids.length === 1) return { ok: false, reason: 'Mindestens ein Kriterium wird gebraucht.' } as const
    // rating_value rows go away via ON DELETE CASCADE
    await tx.delete(ratingCriteria).where(scoped(tastingId, criterionId))
    await renumber(tx, ids.filter((id) => id !== criterionId))
    return { ok: true } as const
  })
}

export async function moveCriterion(
  db: Db,
  tastingId: string,
  criterionId: string,
  direction: Direction,
): Promise<void> {
  await db.transaction(async (tx) => {
    await assertStructureEditable(tx, tastingId)
    const ids = moveInOrder((await listCriteria(tx, tastingId)).map((c) => c.id), criterionId, direction)
    if (ids) await renumber(tx, ids)
  })
}
