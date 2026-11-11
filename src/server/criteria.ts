import { and, asc, eq, max } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { ratingCriteria } from '@/db/schema'
import { moveInOrder } from '@/lib/tasting/order'
import type { Direction } from '@/lib/validation'
import { assertStructureEditable } from './structure'

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
