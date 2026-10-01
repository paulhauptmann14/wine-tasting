import { eq } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { tastings } from '@/db/schema'
import type { PresetKey } from '@/lib/tasting/presets'
import type { TastingStatus } from '@/lib/tasting/rules'
import { createTasting, type Tasting } from '@/server/tastings'

export async function seedTasting(
  db: Db,
  opts: { blindTasting?: boolean; preset?: PresetKey; status?: TastingStatus } = {},
): Promise<Tasting> {
  const tasting = await createTasting(db, {
    name: 'Testabend',
    blindTasting: opts.blindTasting ?? true,
    preset: opts.preset ?? 'classic',
    pin: '1234',
  })
  if (!opts.status || opts.status === tasting.status) return tasting
  const [updated] = await db
    .update(tastings)
    .set({ status: opts.status })
    .where(eq(tastings.id, tasting.id))
    .returning()
  return updated
}
