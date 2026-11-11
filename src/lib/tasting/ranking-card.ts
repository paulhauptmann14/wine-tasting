import { wineDetails } from './display'
import { SCALES, type Scale } from './presets'
import { formatScore, toScale, type Results, type WineResult } from './results'

/** Podium plus rows that still fit 1080 × 1350 legibly; the rest becomes "+ N weitere". */
export const MAX_CARD_ROWS = 10
const PODIUM_SIZE = 3
const SEPARATOR = ' · '
const MAX_TITLE = 48
const MAX_SLUG = 60
const FALLBACK_TITLE = 'Unsere Weinprobe'

/**
 * stacked: up to 3 wines, podium one below the other; roomy: up to 3 rows below a large podium;
 * compact: the full sheet. Few wines fill the sheet instead of floating in the middle.
 */
export type RankingCardLayout = 'stacked' | 'roomy' | 'compact'

/**
 * Characters per slot, so the image never has to clamp a name (two lines on the podium, one in rows).
 * Index: winner, runners-up; rows share one line with the details.
 */
const NAME_BUDGET: Record<RankingCardLayout, readonly [number, number]> = {
  stacked: [38, 44],
  roomy: [38, 26],
  compact: [44, 30],
}
const MAX_ROW_NAME = 38
/** Details per slot in characters – whole parts only, so nothing is cut mid-word */
const DETAIL_BUDGET: Record<RankingCardLayout, readonly [number, number]> = {
  stacked: [48, 48],
  roomy: [48, 22],
  compact: [48, 24],
}
/** Rows share one line between name (serif, wider) and details (smaller sans) */
const ROW_BUDGET = 66
const NAME_TO_DETAIL_WIDTH = 1.25
/** A word break further back than this is not worth it – cut inside the word instead */
const MAX_BREAK_DISTANCE = 10

export type RankingCardWine = {
  wineId: string
  /** Seed for the glass ring – same as in the app */
  position: number
  rank: number
  name: string
  details: string | null
  score: string
}

export type RankingCard = {
  layout: RankingCardLayout
  title: string
  date: string
  podium: RankingCardWine[]
  rest: RankingCardWine[]
  /** Ranked wines that didn't fit on the image */
  hiddenCount: number
  maxLabel: string
  /** Widest possible score ("20,0", "100") – every ring in an image uses the same size for it */
  maxScore: string
  footer: string
}

export type RankingCardMeta = {
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

const dateFormat = new Intl.DateTimeFormat('de-DE', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Berlin' })

/** Keeps as many leading parts of "Weißwein · 2022 · Riesling" as fit into `max` characters. */
export function fitDetails(details: string | null, max: number): string | null {
  if (!details) return null
  const kept: string[] = []
  for (const part of details.split(SEPARATOR)) {
    if ([...kept, part].join(SEPARATOR).length > max) break
    kept.push(part)
  }
  return kept.length > 0 ? kept.join(SEPARATOR) : null
}

function layoutFor(rankedCount: number): RankingCardLayout {
  const rows = Math.min(rankedCount, MAX_CARD_ROWS) - PODIUM_SIZE
  return rows <= 0 ? 'stacked' : rows <= 3 ? 'roomy' : 'compact'
}

const slot = (index: number) => (index === 0 ? 0 : 1)

function nameBudget(layout: RankingCardLayout, index: number) {
  return index < PODIUM_SIZE ? NAME_BUDGET[layout][slot(index)] : MAX_ROW_NAME
}

function detailBudget(layout: RankingCardLayout, index: number, name: string) {
  return index < PODIUM_SIZE
    ? DETAIL_BUDGET[layout][slot(index)]
    : Math.floor(ROW_BUDGET - Array.from(name).length * NAME_TO_DETAIL_WIDTH)
}

/** Details with each part made drawable; parts with nothing left disappear. */
function cardDetails(details: string | null): string | null {
  const parts = details?.split(SEPARATOR).map(cardText).filter(Boolean) ?? []
  return parts.length > 0 ? parts.join(SEPARATOR) : null
}

/** View model for the shareable result image – only ranked wines, capped to what fits. */
export function rankingCard(results: Results, scale: Scale, meta: RankingCardMeta): RankingCard {
  const ranked = results.wines.filter((w): w is WineResult & { rank: number } => w.rank !== null)
  const layout = layoutFor(ranked.length)
  const shown = ranked.slice(0, MAX_CARD_ROWS).map((w, i) => {
    const name = truncate(cardText(w.name ?? '') || w.label, nameBudget(layout, i))
    return {
      wineId: w.wineId,
      position: w.position,
      rank: w.rank,
      name,
      details: w.name ? fitDetails(cardDetails(wineDetails(w)), detailBudget(layout, i, name)) : null,
      score: formatScore(toScale(w.score, scale), scale),
    }
  })
  const { max } = SCALES[scale]
  const guests = meta.guestCount === 1 ? '1 Gast' : `${meta.guestCount} Gäste`
  return {
    layout,
    title: truncate(cardText(meta.tastingName) || FALLBACK_TITLE, MAX_TITLE),
    date: dateFormat.format(meta.date),
    podium: shown.slice(0, PODIUM_SIZE),
    rest: shown.slice(PODIUM_SIZE),
    hiddenCount: ranked.length - shown.length,
    maxLabel: `von ${max}`,
    maxScore: formatScore(max, scale),
    // From the scale: the tasting doesn't keep its preset ("Einfach" also rates out of 5)
    footer: `${max}-Punkte-Skala · ${guests}`,
  }
}

const UMLAUTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', æ: 'ae', œ: 'oe', ø: 'o', ł: 'l', đ: 'd' }

/** "Weinabend bei Paul" → "weinabend-bei-paul-ergebnis.png" – ASCII only, safe for any download header. */
export function rankingImageFilename(tastingName: string): string {
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
  return `${slug || 'wine-tasting'}-ergebnis.png`
}
