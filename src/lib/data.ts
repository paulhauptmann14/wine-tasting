import 'server-only'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'
import { db } from '@/db/client'
import { requireAdmin } from '@/lib/auth/admin-session'
import { getTastingByCode, type Tasting } from '@/server/tastings'

/** Once per request – layout and page share the lookup. */
export const getTasting = cache((code: string) => getTastingByCode(db, code))

/**
 * The tasting or a 404. With `canonicalPath` (a page, e.g. '/results'), a code typed in another
 * spelling redirects to the canonical URL.
 */
export async function requireTasting(code: string, canonicalPath?: string): Promise<Tasting> {
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  if (canonicalPath !== undefined && tasting.code !== code) redirect(`/tasting/${tasting.code}${canonicalPath}`)
  return tasting
}

/**
 * Load the tasting AND check admin access – call this in every admin page and action.
 * The layout alone doesn't protect: Next also renders page segments via RSC requests
 * without running the layout again.
 */
export async function getAdminTasting(code: string): Promise<Tasting> {
  const tasting = await requireTasting(code)
  await requireAdmin(tasting)
  return tasting
}
