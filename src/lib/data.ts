import 'server-only'
import { notFound } from 'next/navigation'
import { cache } from 'react'
import { db } from '@/db/client'
import { requireAdmin } from '@/lib/auth/admin-session'
import { getTastingByCode, type Tasting } from '@/server/tastings'

/** Einmal pro Request – Layout und Seite teilen sich den Lookup. */
export const getTasting = cache((code: string) => getTastingByCode(db, code))

/**
 * Tasting laden UND Admin-Zugriff prüfen – in jeder Admin-Seite und -Action aufrufen.
 * Das Layout allein schützt nicht: Next rendert Seiten-Segmente auch per RSC-Anfrage,
 * ohne das Layout erneut auszuführen.
 */
export async function getAdminTasting(code: string): Promise<Tasting> {
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  await requireAdmin(tasting)
  return tasting
}
