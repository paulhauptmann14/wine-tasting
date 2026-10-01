import { ResultsView } from '@/components/results-view'
import { db } from '@/db/client'
import { canSeeResults, canSeeWineNames } from '@/lib/tasting/rules'
import { computeResults } from '@/lib/tasting/results'
import { loadResultsInput } from '@/server/results-data'
import type { Tasting } from '@/server/tastings'

export async function ResultsSection({ tasting, isAdmin }: { tasting: Tasting; isAdmin: boolean }) {
  if (!canSeeResults(tasting.status, isAdmin)) {
    return <p className="mt-10 text-muted-foreground">Die Ergebnisse erscheinen, sobald das Tasting läuft.</p>
  }
  const input = await loadResultsInput(db, tasting.id)
  // Namen entscheidet der Server – Gäste sehen Blindweine erst bei „finished“
  const results = computeResults({
    ...input,
    revealNames: canSeeWineNames({ status: tasting.status, blindTasting: tasting.blindTasting, isAdmin }),
  })
  return <ResultsView results={results} status={tasting.status} />
}
