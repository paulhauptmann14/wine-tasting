import { ResultsView } from '@/components/results-view'
import { db } from '@/db/client'
import { canSeeNotes, canSeeResults } from '@/lib/tasting/rules'
import { listWineNotes, loadResults } from '@/server/results-data'
import type { Tasting } from '@/server/tastings'

export async function ResultsSection({ tasting, isAdmin }: { tasting: Tasting; isAdmin: boolean }) {
  if (!canSeeResults(tasting.status, isAdmin)) {
    return <p className="mt-10 text-muted-foreground">Die Ergebnisse erscheinen, sobald das Tasting läuft.</p>
  }
  const [results, notes] = await Promise.all([
    loadResults(db, tasting, isAdmin),
    // Notes aren't loaded at all before the end
    canSeeNotes(tasting.status) ? listWineNotes(db, tasting.id) : undefined,
  ])
  return <ResultsView results={results} status={tasting.status} scale={tasting.scale} notes={notes} />
}
