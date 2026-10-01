import { and, asc, eq, max } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { ratingCriteria } from '@/db/schema'

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

export async function addCriterion(db: Db, tastingId: string, name: string): Promise<Criterion> {
  return db.transaction(async (tx) => {
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
    const ids = (await listCriteria(tx, tastingId)).map((c) => c.id)
    if (!ids.includes(criterionId)) return { ok: true } as const
    if (ids.length === 1) return { ok: false, reason: 'Mindestens ein Kriterium wird gebraucht.' } as const
    // rating_value-Zeilen fallen per ON DELETE CASCADE weg
    await tx.delete(ratingCriteria).where(scoped(tastingId, criterionId))
    await renumber(tx, ids.filter((id) => id !== criterionId))
    return { ok: true } as const
  })
}

export async function moveCriterion(
  db: Db,
  tastingId: string,
  criterionId: string,
  direction: 'up' | 'down',
): Promise<void> {
  await db.transaction(async (tx) => {
    const ids = (await listCriteria(tx, tastingId)).map((c) => c.id)
    const from = ids.indexOf(criterionId)
    const to = direction === 'up' ? from - 1 : from + 1
    if (from < 0 || to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    await renumber(tx, ids)
  })
}
