import 'server-only'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { db } from '@/db/client'
import { requireAdmin } from '@/lib/auth/admin-session'
import { getTastingByCode, type Tasting } from '@/server/tastings'

/** Once per request – layout and page share the lookup. */
export const getTasting = cache((code: string) => getTastingByCode(db, code))

/**
 * Load the tasting AND check admin access – call this in every admin page and action.
 * The layout alone doesn't protect: Next also renders page segments via RSC requests
 * without running the layout again.
 */
export async function getAdminTasting(code: string): Promise<Tasting> {
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  await requireAdmin(tasting)
  return tasting
}
