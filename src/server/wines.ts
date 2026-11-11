import { and, asc, eq, max } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { wines } from '@/db/schema'
import type { WineInput } from '@/lib/validation'
import { assertStructureEditable } from './structure'

export type Wine = typeof wines.$inferSelect

export async function listWines(db: Db, tastingId: string): Promise<Wine[]> {
  return db.select().from(wines).where(eq(wines.tastingId, tastingId)).orderBy(asc(wines.position))
}

export async function getWineByPosition(db: Db, tastingId: string, position: number): Promise<Wine | null> {
  const [wine] = await db
    .select()
    .from(wines)
    .where(and(eq(wines.tastingId, tastingId), eq(wines.position, position)))
  return wine ?? null
}

export async function getWineById(db: Db, tastingId: string, wineId: string): Promise<Wine | null> {
  const [wine] = await db
    .select()
    .from(wines)
    .where(and(eq(wines.id, wineId), eq(wines.tastingId, tastingId)))
  return wine ?? null
}

export async function addWine(db: Db, tastingId: string, input: WineInput): Promise<Wine> {
  return db.transaction(async (tx) => {
    const [{ last }] = await tx
      .select({ last: max(wines.position) })
      .from(wines)
      .where(eq(wines.tastingId, tastingId))
    const [wine] = await tx
      .insert(wines)
      .values({ tastingId, position: (last ?? 0) + 1, ...input })
      .returning()
    return wine
  })
}

export async function updateWine(db: Db, tastingId: string, wineId: string, input: WineInput): Promise<void> {
  await db
    .update(wines)
    .set(input)
    .where(and(eq(wines.id, wineId), eq(wines.tastingId, tastingId)))
}

/**
 * Assigns positions 1..n in the given order. Goes through negative intermediate values
 * so UNIQUE(tasting_id, position) is never violated in between.
 */
async function renumber(tx: Db, orderedIds: string[]): Promise<void> {
  for (const [i, id] of orderedIds.entries()) {
    await tx.update(wines).set({ position: -(i + 1) }).where(eq(wines.id, id))
  }
  for (const [i, id] of orderedIds.entries()) {
    await tx.update(wines).set({ position: i + 1 }).where(eq(wines.id, id))
  }
}

async function orderedIds(tx: Db, tastingId: string): Promise<string[]> {
  const rows = await tx
    .select({ id: wines.id })
    .from(wines)
    .where(eq(wines.tastingId, tastingId))
    .orderBy(asc(wines.position))
  return rows.map((r) => r.id)
}

export async function deleteWine(db: Db, tastingId: string, wineId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await assertStructureEditable(tx, tastingId)
    const deleted = await tx
      .delete(wines)
      .where(and(eq(wines.id, wineId), eq(wines.tastingId, tastingId)))
      .returning({ id: wines.id })
    if (deleted.length === 0) return
    await renumber(tx, await orderedIds(tx, tastingId))
  })
}

export async function moveWine(
  db: Db,
  tastingId: string,
  wineId: string,
  direction: 'up' | 'down',
): Promise<void> {
  // Allowed in every phase: wines are often poured in a different order than planned.
  // Ratings belong to the wine id, so they move along with it.
  await db.transaction(async (tx) => {
    const ids = await orderedIds(tx, tastingId)
    const from = ids.indexOf(wineId)
    const to = direction === 'up' ? from - 1 : from + 1
    if (from < 0 || to < 0 || to >= ids.length) return
    ;[ids[from], ids[to]] = [ids[to], ids[from]]
    await renumber(tx, ids)
  })
}
