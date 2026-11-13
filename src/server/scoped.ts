import { and, eq } from 'drizzle-orm'
import type { AnyPgColumn } from 'drizzle-orm/pg-core'

/**
 * "This row, but only within this tasting": the condition that keeps a host from reading or changing
 * another tasting's wines, guests or criteria by sending a foreign ID.
 */
export const scoped = (table: { id: AnyPgColumn; tastingId: AnyPgColumn }, tastingId: string, id: string) =>
  and(eq(table.id, id), eq(table.tastingId, tastingId))
