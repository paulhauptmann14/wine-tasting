import { randomInt } from 'node:crypto'
import { and, asc, eq, max } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { ratings, tastings, wines } from '@/db/schema'
import { moveInOrder, shuffleUnrated, type RandomInt } from '@/lib/tasting/order'
import { SHUFFLE_FINISHED_HINT, canShuffleWines, type TastingStatus } from '@/lib/tasting/rules'
import type { WineType } from '@/lib/tasting/wine-type'
import type { Direction, WineInput } from '@/lib/validation'
import { assertStructureEditable } from './structure'

export type Wine = typeof wines.$inferSelect

/**
 * What the services store. Validation requires the wine type (WineInput), but the column stays nullable
 * for wines created before that rule, so the services accept both.
 */
export type WineFields = Omit<WineInput, 'wineType'> & { wineType: WineType | null }

export async function listWines(db: Db, tastingId: string): Promise<Wine[]> {
  return db.select().from(wines).where(eq(wines.tastingId, tastingId)).orderBy(asc(wines.position))
}

export async function countWines(db: Db, tastingId: string): Promise<number> {
  return db.$count(wines, eq(wines.tastingId, tastingId))
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

/**
 * Locks the tasting row until the transaction ends, so addWine, deleteWine, moveWine and shuffleWines of one
 * tasting run one after another (they all renumber or append positions). Uses FOR NO KEY UPDATE so guests
 * joining (FK inserts, FOR KEY SHARE) are not blocked. Returns the status, or null if unknown.
 */
async function lockTasting(tx: Db, tastingId: string): Promise<TastingStatus | null> {
  const [row] = await tx
    .select({ status: tastings.status })
    .from(tastings)
    .where(eq(tastings.id, tastingId))
    .for('no key update')
  return row?.status ?? null
}

export async function addWine(db: Db, tastingId: string, input: WineFields): Promise<Wine> {
  return db.transaction(async (tx) => {
    await lockTasting(tx, tastingId)
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

export async function updateWine(db: Db, tastingId: string, wineId: string, input: WineFields): Promise<void> {
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

async function orderedIds(tx: Db, tastingId: string, lockRows = false): Promise<string[]> {
  const query = tx
    .select({ id: wines.id })
    .from(wines)
    .where(eq(wines.tastingId, tastingId))
    .orderBy(asc(wines.position))
  const rows = await (lockRows ? query.for('update') : query)
  return rows.map((r) => r.id)
}

export async function deleteWine(db: Db, tastingId: string, wineId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await lockTasting(tx, tastingId)
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
  direction: Direction,
): Promise<void> {
  // Allowed in every phase: wines are often poured in a different order than planned.
  // Ratings belong to the wine id, so they move along with it.
  await db.transaction(async (tx) => {
    await lockTasting(tx, tastingId)
    const ids = moveInOrder(await orderedIds(tx, tastingId), wineId, direction)
    if (ids) await renumber(tx, ids)
  })
}

/** Ids of the wines of this tasting that at least one guest has rated. */
export async function ratedWineIds(db: Db, tastingId: string): Promise<Set<string>> {
  const rows = await db
    .selectDistinct({ wineId: ratings.wineId })
    .from(ratings)
    .innerJoin(wines, eq(wines.id, ratings.wineId))
    .where(eq(wines.tastingId, tastingId))
  return new Set(rows.map((r) => r.wineId))
}

export type ShuffleResult = { ok: true; shuffled: number; order: string[] } | { ok: false; reason: string }

/**
 * Shuffles the pouring order of the wines nobody has rated yet; they trade places among themselves,
 * rated wines keep their number. Ratings hang on the wine id, so no guest loses anything.
 * `shuffled` is the number of wines that were part of the shuffle (0 = nothing to do),
 * `order` the wine names in the new pouring order (position 1 first; empty if nothing moved).
 */
export async function shuffleWines(
  db: Db,
  tastingId: string,
  random: RandomInt = (limit) => randomInt(limit),
): Promise<ShuffleResult> {
  return db.transaction(async (tx) => {
    const status = await lockTasting(tx, tastingId)
    if (!status) return { ok: false, reason: 'Tasting nicht gefunden.' } as const
    if (!canShuffleWines(status)) return { ok: false, reason: SHUFFLE_FINISHED_HINT } as const

    // Lock the wine rows first: a rating being saved holds a key share lock on its wine (FK check),
    // so it either finishes before we read the rated wines or waits until the shuffle is committed.
    const ids = await orderedIds(tx, tastingId, true)
    const rated = await ratedWineIds(tx, tastingId)
    const current = ids.map((id) => ({ id, rated: rated.has(id) }))
    const shuffled = shuffleUnrated(current, random)
    if (!shuffled) return { ok: true, shuffled: 0, order: [] } as const
    await renumber(tx, shuffled)
    const order = (await listWines(tx, tastingId)).map((wine) => wine.name)
    return { ok: true, shuffled: current.filter((wine) => !wine.rated).length, order } as const
  })
}
