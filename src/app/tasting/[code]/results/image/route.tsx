import { db } from '@/db/client'
import { getTasting } from '@/lib/data'
import { rankingImage } from '@/lib/ranking-image'
import { rankingCard, rankingImageFilename } from '@/lib/tasting/ranking-card'
import { computeResults } from '@/lib/tasting/results'
import { canSeeWineNames } from '@/lib/tasting/rules'
import { countParticipants } from '@/server/participants'
import { loadResultsInput } from '@/server/results-data'

// The status can go back from "finished" to "active" – never keep a copy anywhere
const NO_STORE = { 'Cache-Control': 'private, no-store' }

/** The final ranking as a PNG to share – only once the tasting is finished. */
export async function GET(_request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getTasting(code)
  if (!tasting || tasting.status !== 'finished') {
    return new Response('Nicht gefunden', { status: 404, headers: NO_STORE })
  }

  const [input, guestCount] = await Promise.all([loadResultsInput(db, tasting.id), countParticipants(db, tasting.id)])
  const results = computeResults({
    ...input,
    revealNames: canSeeWineNames({ status: tasting.status, blindTasting: tasting.blindTasting, isAdmin: false }),
  })
  const card = rankingCard(results, tasting.scale, {
    tastingName: tasting.name,
    guestCount,
    date: tasting.createdAt,
  })

  try {
    return await rankingImage(card, {
      ...NO_STORE,
      'Content-Disposition': `inline; filename="${rankingImageFilename(tasting.name)}"`,
    })
  } catch (error) {
    // e.g. missing font files – the next request tries again
    console.error('Ranking image failed', error)
    return new Response('Bild konnte nicht erstellt werden', { status: 500, headers: NO_STORE })
  }
}
