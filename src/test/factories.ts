import { eq } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { tastings } from '@/db/schema'
import type { PresetKey } from '@/lib/tasting/presets'
import type { TastingStatus } from '@/lib/tasting/rules'
import type { WineFields } from '@/server/wines'
import { createTasting, type Tasting } from '@/server/tastings'

export async function seedTasting(
  db: Db,
  opts: { blindTasting?: boolean; preset?: PresetKey; status?: TastingStatus } = {},
): Promise<Tasting> {
  const tasting = await createTasting(db, {
    name: 'Testabend',
    blindTasting: opts.blindTasting ?? true,
    preset: opts.preset ?? 'five',
    pin: '1234',
  })
  if (!opts.status || opts.status === tasting.status) return tasting
  return forceStatus(db, tasting.id, opts.status)
}

/** Sets the status directly, skipping the transition rules of setTastingStatus. */
export async function forceStatus(db: Db, tastingId: string, status: TastingStatus): Promise<Tasting> {
  const [updated] = await db.update(tastings).set({ status }).where(eq(tastings.id, tastingId)).returning()
  return updated
}

/** A wine with only a name – the details stay empty unless given (wines from before the required type have none). */
export const wineInput = (name: string, overrides: Partial<WineFields> = {}): WineFields => ({
  name,
  winery: null,
  vintage: null,
  grapeVariety: null,
  sweetness: null,
  wineType: null,
  ...overrides,
})
