import { ResultsView } from '@/components/results-view'
import { db } from '@/db/client'
import { computeReview } from '@/lib/tasting/review'
import { canSeeNotes, canSeeResults } from '@/lib/tasting/rules'
import { listWineNotes, loadResultsWithInput } from '@/server/results-data'
import type { Tasting } from '@/server/tastings'

/**
 * `reviewFor`: undefined = no review (admin area), null = group part only (not a guest),
 * participant ID = personal review. Only computed once the tasting is finished.
 */
export async function ResultsSection({
  tasting,
  isAdmin,
  reviewFor,
}: {
  tasting: Tasting
  isAdmin: boolean
  reviewFor?: string | null
}) {
  if (!canSeeResults(tasting.status, isAdmin)) {
    return <p className="mt-10 text-muted-foreground">Die Ergebnisse erscheinen, sobald das Tasting läuft.</p>
  }
  const [{ input, results }, notes] = await Promise.all([
    loadResultsWithInput(db, tasting, isAdmin),
    // Notes aren't loaded at all before the end
    canSeeNotes(tasting.status) ? listWineNotes(db, tasting.id) : undefined,
  ])
  const review = tasting.status === 'finished' && reviewFor !== undefined ? computeReview(input, results, reviewFor) : undefined
  return <ResultsView results={results} status={tasting.status} scale={tasting.scale} notes={notes} review={review} />
}
