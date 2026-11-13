import { formatDate } from '@/lib/format-date'
import { wineDetails } from './display'
import { SCALES, type Scale } from './presets'
import { formatScaled, formatScore, type Results, type WineResult } from './results'

/** Rows below the podium on image 1 */
export const PODIUM_ROWS = 7
/** Rows on a follow-up image */
export const CONTINUATION_ROWS = 14
/** Up to this many wines fit on one image (podium + PODIUM_ROWS) */
const SINGLE_IMAGE_WINES = 10
const PODIUM_SIZE = 3
const UNRATED_SCORE = '–'
const SEPARATOR = ' · '
const MAX_TITLE = 48
const MAX_SLUG = 60
const FALLBACK_TITLE = 'Unsere Weinprobe'

/**
 * stacked: up to 3 wines, podium one below the other; roomy: up to 3 rows below a large podium;
 * compact: the full sheet. Few wines fill the sheet instead of floating in the middle.
 */
export type RankingCardLayout = 'stacked' | 'roomy' | 'compact'

type Budget = { name: number; detail: number }
/**
 * Characters per podium slot (winner, runners-up), so the image never has to clamp a name (two lines
 * on the podium). Details count whole parts only, so nothing is cut mid-word.
 */
const PODIUM_BUDGET: Record<RankingCardLayout, readonly [Budget, Budget]> = {
  stacked: [{ name: 38, detail: 48 }, { name: 44, detail: 48 }],
  roomy: [{ name: 38, detail: 48 }, { name: 26, detail: 22 }],
  compact: [{ name: 44, detail: 48 }, { name: 30, detail: 24 }],
}
export const MAX_ROW_NAME = 38
/** Rows share one line between name (serif, wider) and details (smaller sans) */
const ROW_BUDGET = 66
const NAME_TO_DETAIL_WIDTH = 1.25
/** A word break further back than this is not worth it – cut inside the word instead */
const MAX_BREAK_DISTANCE = 10

export type RankingCardKind = 'podium' | 'rows'

export type RankingCardWine = {
  wineId: string
  /** Seed for the glass ring – same as in the app */
  position: number
  /** null for wines nobody rated */
  rank: number | null
  name: string
  details: string | null
  score: string
}

export type RankingCard = {
  kind: RankingCardKind
  layout: RankingCardLayout
  /** 1-based */
  page: number
  pageCount: number
  title: string
  date: string
  /** Follow-ups: "Weine 11–18 von 25"; image 1: null */
  rangeLabel: string | null
  /** Empty on follow-ups */
  podium: RankingCardWine[]
  rest: RankingCardWine[]
  maxLabel: string
  /** Widest possible score ("20,0", "100") – every ring in an image uses the same size for it */
  maxScore: string
  footer: string
}

type RankingCardMeta = {
  tastingName: string
  guestCount: number
  date: Date
}

/**
 * Everything the bundled Latin fonts (assets/fonts) can draw. Keep in sync with the font files.
 * Any other character makes next/og fetch a font from Google Fonts or an emoji from a CDN –
 * sending parts of the names out and failing offline (Raspberry Pi). Never skip cardText().
 */
export const CARD_CHAR =
  /^[\u0020-\u007e\u00a0-\u00ac\u00ae-\u00ff\u0131\u0152\u0153\u02bc\u02c6\u02da\u02dc\u2013\u2014\u2018-\u201a\u201c-\u201e\u2022\u2026\u2032\u2033\u2039\u203a\u2044\u20ac\u2122\u2212]$/

/** Letters without a decomposition into base + accent */
const TRANSLITERATIONS: Record<string, string> = { ł: 'l', Ł: 'L', đ: 'd', Đ: 'D', ħ: 'h', Ħ: 'H', ŧ: 't', Ŧ: 'T', '\u2010': '-', '\u2011': '-' }

/** Text for the image: "Graševina" → "Grasevina", emoji and other scripts are dropped. */
export function cardText(text: string): string {
  return Array.from(text.normalize('NFC').replace(/\s+/g, ' '), (c) => {
    if (CARD_CHAR.test(c)) return c
    // š → s + caron → s; ﬁ → fi
    const base = (TRANSLITERATIONS[c] ?? c).normalize('NFKD').replace(/\p{M}/gu, '')
    return Array.from(base).filter((b) => CARD_CHAR.test(b)).join('')
  })
    .join('')
    .replace(/ {2,}/g, ' ')
    .trim()
}

const isBreak = (c: string) => c === ' ' || c === '-' || c === '/'

/** Cuts by characters (not UTF-16 units), preferably at a word break, and ends with an ellipsis. */
function truncate(text: string, max: number): string {
  const chars = Array.from(text.trim())
  if (chars.length <= max) return chars.join('')
  let end = max - 1
  while (end > 0 && !isBreak(chars[end])) end--
  if (end < max - 1 - MAX_BREAK_DISTANCE) end = max - 1
  // No dangling "&", "–" or comma before the ellipsis
  return chars.slice(0, end).join('').replace(/[\s\p{P}\p{S}]+$/u, '') + '…'
}

/**
 * Keeps as many leading parts of "Weingut Dr. Loosen · Weißwein · 2022" as fit into `max` characters.
 * A first part that is too long on its own (a long winery) is dropped, so it doesn't take the type
 * and vintage with it.
 */
export function fitDetails(details: string | null, max: number): string | null {
  if (!details) return null
  const kept: string[] = []
  const parts = details.split(SEPARATOR)
  for (const [i, part] of parts.entries()) {
    if ([...kept, part].join(SEPARATOR).length > max) {
      if (i === 0) continue
      break
    }
    kept.push(part)
  }
  return kept.length > 0 ? kept.join(SEPARATOR) : null
}

function layoutFor(rows: number): RankingCardLayout {
  return rows <= 0 ? 'stacked' : rows <= 3 ? 'roomy' : 'compact'
}

/** Details with each part made drawable; parts with nothing left disappear. */
function cardDetails(details: string | null): string | null {
  const parts = details?.split(SEPARATOR).map(cardText).filter(Boolean) ?? []
  return parts.length > 0 ? parts.join(SEPARATOR) : null
}

/** Rows below the podium for a tasting with this many wines. */
function rowCount(wineCount: number): number {
  return Math.max(0, wineCount - PODIUM_SIZE)
}

/** Address of one share image – image 1 has no parameter, so a single image keeps its old address. */
export function rankingImageUrl(code: string, page: number): string {
  const base = `/tasting/${code}/results/image`
  return page === 1 ? base : `${base}?bild=${page}`
}

/** How many share images a tasting with this many wines needs. */
export function rankingImageCount(wineCount: number): number {
  return imageCountFor(rowCount(wineCount), PODIUM_ROWS)
}

function imageCountFor(rows: number, firstCapacity: number): number {
  if (rows <= firstCapacity) return 1
  return 1 + Math.ceil((rows - firstCapacity) / CONTINUATION_ROWS)
}

/** Rows per image: image 1 takes up to `firstCapacity`, the rest is spread evenly, larger images first. */
function splitRows(rows: number, imageCount: number, firstCapacity = PODIUM_ROWS): number[] {
  const first = Math.min(firstCapacity, Math.ceil(rows / imageCount))
  const rest = rows - first
  const others = imageCount - 1
  return [first, ...Array.from({ length: others }, (_, i) => Math.floor(rest / others) + (i < rest % others ? 1 : 0))]
}

/**
 * View model for the shareable result images – all wines, rated ones by rank, then unrated ones by
 * number. Image 1 has the podium, follow-ups only rows.
 */
export function rankingCards(results: Results, scale: Scale, meta: RankingCardMeta): RankingCard[] {
  const list = results.wines
  const podiumEntries = list.slice(0, PODIUM_SIZE)
  // Unrated wines never stand on the podium – they lead the rows (they are all unrated from here on)
  const podiumWines = podiumEntries.filter((w) => w.rank !== null)
  const rows = [...podiumEntries.filter((w) => w.rank === null), ...list.slice(PODIUM_SIZE)]
  // Image 1 holds SINGLE_IMAGE_WINES entries in total: unrated wines that left the podium take its places
  const firstCapacity = SINGLE_IMAGE_WINES - podiumWines.length
  const pageCount = imageCountFor(rows.length, firstCapacity)
  const sizes = splitRows(rows.length, pageCount, firstCapacity)
  const layout = layoutFor(sizes[0])

  const toWine = (w: WineResult, budget: Budget | null): RankingCardWine => {
    const name = truncate(cardText(w.name ?? '') || w.label, budget?.name ?? MAX_ROW_NAME)
    // Rows share one line with the details
    const detailBudget = budget?.detail ?? Math.floor(ROW_BUDGET - Array.from(name).length * NAME_TO_DETAIL_WIDTH)
    return {
      wineId: w.wineId,
      position: w.position,
      rank: w.rank,
      name,
      details: w.name ? fitDetails(cardDetails(wineDetails(w)), detailBudget) : null,
      score: w.score === null ? UNRATED_SCORE : formatScaled(w.score, scale),
    }
  }

  const { max } = SCALES[scale]
  const guests = meta.guestCount === 1 ? '1 Gast' : `${meta.guestCount} Gäste`
  const title = truncate(cardText(meta.tastingName) || FALLBACK_TITLE, MAX_TITLE)
  const date = formatDate(meta.date)
  // From the scale: the tasting doesn't keep its preset ("Einfach" also rates out of 5)
  const scaleAndGuests = `${max}-Punkte-Skala · ${guests}`

  let offset = 0
  return sizes.map((size, i) => {
    const page = i + 1
    const pageRows = rows.slice(offset, offset + size)
    const first = podiumWines.length + offset
    offset += size
    const isFirst = page === 1
    return {
      kind: isFirst ? 'podium' : 'rows',
      layout: isFirst ? layout : 'compact',
      page,
      pageCount,
      title,
      date,
      rangeLabel: isFirst ? null : `Weine ${first + 1}–${first + size} von ${list.length}`,
      podium: isFirst ? podiumWines.map((w, j) => toWine(w, PODIUM_BUDGET[layout][j === 0 ? 0 : 1])) : [],
      rest: pageRows.map((w) => toWine(w, null)),
      maxLabel: `von ${max}`,
      maxScore: formatScore(max, scale),
      footer: pageCount > 1 ? `Bild ${page} von ${pageCount}${SEPARATOR}${scaleAndGuests}` : scaleAndGuests,
    }
  })
}

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', ł: 'l', đ: 'd' }

/**
 * "Weinabend bei Paul" → "weinabend-bei-paul-ergebnis.png", with several images "…-ergebnis-2.png"
 * – ASCII only, safe for any download header.
 */
export function rankingImageFilename(tastingName: string, page = 1, pageCount = 1): string {
  const slug = tastingName
    // Compose first: a decomposed "ü" (u + ¨) would otherwise lose its "e"
    .normalize('NFC')
    .toLowerCase()
    .replace(/[äöüßæœøłđ]/g, (c) => UMLAUTS[c])
    // é → e etc.: split off the accents, then drop everything that isn't ASCII
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, MAX_SLUG)
    .replace(/^-+|-+$/g, '')
  return `${slug || 'wine-tasting'}-ergebnis${pageCount > 1 ? `-${page}` : ''}.png`
}
