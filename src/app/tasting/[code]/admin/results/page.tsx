import type { Metadata } from 'next'
import { AutoRefresh } from '@/components/auto-refresh'
import { ResultsSection } from '@/components/results-section'
import { marginNote } from '@/components/styles'
import { getAdminTasting } from '@/lib/data'
import { BLIND_ADMIN_HINT } from '@/lib/tasting/rules'

export const metadata: Metadata = { title: 'Ergebnisse · Verwaltung' }

export default async function AdminResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  return (
    <>
      {tasting.status !== 'finished' && <AutoRefresh />}
      {tasting.blindTasting && tasting.status === 'active' && <p className={`${marginNote} mb-6`}>{BLIND_ADMIN_HINT}</p>}
      <ResultsSection tasting={tasting} isAdmin />
    </>
  )
}
