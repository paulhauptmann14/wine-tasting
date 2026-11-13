import { createHash, randomUUID } from 'node:crypto'
import { db } from '@/db/client'
import { getTasting } from '@/lib/data'
import { rankingImage } from './ranking-image'
import { rankingCards, rankingImageFilename, type RankingCard } from '@/lib/tasting/ranking-card'
import { countParticipants } from '@/server/participants'
import { loadResults } from '@/server/results-data'

// No image yet (or anymore): never keep a copy of this answer
const NO_STORE = { 'Cache-Control': 'private, no-store' }
// A finished ranking still changes – wines can be edited, the tasting reopened and finished again.
// So the browser may keep the image, but asks every time; the ETag tells whether it is still current.
const REVALIDATE = { 'Cache-Control': 'private, no-cache' }

// New per process: after an update or restart, no browser gets an image in an older design
const ETAG_SALT = randomUUID()

/** Hash of everything the image shows – equal ETag, equal PNG. */
function etagFor(card: RankingCard, filename: string): string {
  const hash = createHash('sha256').update(ETAG_SALT).update(JSON.stringify(card)).update(filename)
  return `"${hash.digest('base64url').slice(0, 27)}"`
}

function matches(ifNoneMatch: string | null, etag: string): boolean {
  return Boolean(ifNoneMatch?.split(',').some((tag) => tag.trim().replace(/^W\//, '') === etag))
}

// Rendering costs ~300 ms of CPU (much more on a Raspberry Pi), and every guest's results page
// loads the image the moment the tasting ends: one render per image, shared by all requests.
// Only a few recent images (a tasting has up to a few) – an older tasting simply renders again.
const MAX_RENDERS = 16
const renders = new Map<string, Promise<ArrayBuffer>>()

function render(etag: string, card: RankingCard): Promise<ArrayBuffer> {
  const cached = renders.get(etag)
  if (cached) {
    // Most recently used goes last, so it's evicted last
    renders.delete(etag)
    renders.set(etag, cached)
    return cached
  }
  const png = rankingImage(card, {}).then((res) => res.arrayBuffer())
  renders.set(etag, png)
  // A failed render is tried again on the next request
  png.catch(() => {
    if (renders.get(etag) === png) renders.delete(etag)
  })
  if (renders.size > MAX_RENDERS) renders.delete(renders.keys().next().value!)
  return png
}

/** The final ranking as a PNG to share – only once the tasting is finished. */
export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getTasting(code)
  if (!tasting || tasting.status !== 'finished') {
    return new Response('Nicht gefunden', { status: 404, headers: NO_STORE })
  }

  // ?bild=n picks the image of a long ranking; none means image 1. Anything else is unknown
  const requested = new URL(request.url).searchParams.get('bild') ?? '1'
  if (!/^[1-9]\d{0,2}$/.test(requested)) return new Response('Nicht gefunden', { status: 404, headers: NO_STORE })
  const page = Number(requested)

  // Whether the number is too large depends on the ranking
  const [results, guestCount] = await Promise.all([loadResults(db, tasting, false), countParticipants(db, tasting.id)])
  const cards = rankingCards(results, tasting.scale, {
    tastingName: tasting.name,
    guestCount,
    date: tasting.createdAt,
  })
  const card = cards[page - 1]
  if (!card) return new Response('Nicht gefunden', { status: 404, headers: NO_STORE })
  const filename = rankingImageFilename(tasting.name, card.page, card.pageCount)
  const etag = etagFor(card, filename)
  if (matches(request.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: 304, headers: { ...REVALIDATE, ETag: etag } })
  }

  try {
    return new Response(await render(etag, card), {
      headers: {
        ...REVALIDATE,
        ETag: etag,
        'Content-Type': 'image/png',
        'Content-Disposition': `inline; filename="${filename}"`,
      },
    })
  } catch (error) {
    // e.g. missing font files – the next request tries again
    console.error('Ranking image failed', error)
    return new Response('Bild konnte nicht erstellt werden', { status: 500, headers: NO_STORE })
  }
}
