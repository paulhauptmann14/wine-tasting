import { notFound } from 'next/navigation'
import { AutoRefresh } from '@/components/auto-refresh'
import { ResultsSection } from '@/components/results-section'
import { getTasting } from '@/lib/data'

export default async function AdminResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  return (
    <>
      {tasting.status !== 'finished' && <AutoRefresh />}
      <ResultsSection tasting={tasting} isAdmin />
    </>
  )
}
