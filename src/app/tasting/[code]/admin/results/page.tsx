import { AutoRefresh } from '@/components/auto-refresh'
import { ResultsSection } from '@/components/results-section'
import { getAdminTasting } from '@/lib/data'

export default async function AdminResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  return (
    <>
      {tasting.status !== 'finished' && <AutoRefresh />}
      <ResultsSection tasting={tasting} isAdmin />
    </>
  )
}
