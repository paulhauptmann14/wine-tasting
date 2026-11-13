import { sql } from 'drizzle-orm'
import type { Db } from '@/db/types'

class Rollback extends Error {}

/**
 * Runs fn in a transaction (rolled back afterwards) and reports whether that transaction holds a lock
 * on the tasting row. PGlite has one connection and can't interleave transactions, so races are checked
 * against real Postgres; this proves the lock that concurrent writers have to wait for.
 * A locked row carries the locker's transaction id in xmax; earlier lockers are committed by now, so
 * 'in progress' means this transaction (or one of its savepoints) holds it. Note: a row this transaction
 * UPDATEd has a fresh version with xmax 0 – test a path that only locks.
 */
export async function locksTastingRow(db: Db, tastingId: string, fn: (tx: Db) => Promise<unknown>): Promise<boolean> {
  let locked = false
  await db
    .transaction(async (tx) => {
      await fn(tx)
      const rows = await tx.execute(
        sql`select pg_xact_status(xmax::text::xid8) = 'in progress' as locked from tasting where id = ${tastingId}`,
      )
      locked = (rows as unknown as { rows?: { locked: boolean }[] }).rows?.[0]?.locked ?? false
      throw new Rollback()
    })
    .catch((e) => {
      if (!(e instanceof Rollback)) throw e
    })
  return locked
}
