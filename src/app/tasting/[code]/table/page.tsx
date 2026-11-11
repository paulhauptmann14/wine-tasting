import type { Metadata } from 'next'
import { AutoRefresh } from '@/components/auto-refresh'
import { TableView } from '@/components/table-view'
import { db } from '@/db/client'
import { getJoinUrl } from '@/lib/base-url'
import { requireTasting } from '@/lib/data'
import { joinQrSvg } from '@/lib/qr'
import { countParticipants } from '@/server/participants'
import { loadResults } from '@/server/results-data'

export const metadata: Metadata = { title: 'Tisch-Ansicht · Wine Tasting' }

/** Table view: anyone with the code, no joining – so it shows only counts, never guest names. */
export default async function TablePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await requireTasting(code, '/table')

  const joinUrl = await getJoinUrl(tasting.code)
  const [qrSvg, guests, results] = await Promise.all([
    joinQrSvg(joinUrl),
    countParticipants(db, tasting.id),
    // Same rules as for a guest: blind names only once the tasting is finished
    loadResults(db, tasting, false),
  ])

  return (
    <>
      {/* Follows the evening: start, progress and the reveal appear without reloading */}
      <AutoRefresh />
      <TableView
        name={tasting.name}
        code={tasting.code}
        status={tasting.status}
        joinUrl={joinUrl}
        qrSvg={qrSvg}
        guests={guests}
        // Only position, title and count leave the server while tasting – no scores
        wines={[...results.wines]
          .sort((a, b) => a.position - b.position)
          .map((w) => ({ id: w.wineId, position: w.position, title: w.name ?? w.label, ratingCount: w.ratingCount }))}
        podium={tasting.status === 'finished' ? results.wines : null}
        scale={tasting.scale}
      />
    </>
  )
}
