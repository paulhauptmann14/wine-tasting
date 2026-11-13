// Turns OCR lines of a wine label into suggestions for the wine form. Pure and browser-safe.
//
// Rule of the house: rather empty than wrong. `sure` is true only when a value is very likely
// right – a printed keyword read clearly, or a hit in a reference list (appellation, vineyard
// site, winery). Only sure values are filled in by the form. Everything else is a suggestion:
// unsure field guesses, `nameCandidates` / `wineryCandidates` for the host to tap, and taste lines
// ("Süß & fruchtig") as `descriptionCandidates`, which are never sure.

import { MAX_ALCOHOL, MIN_ALCOHOL } from '@/lib/tasting/alcohol'
import type { Sweetness } from '@/lib/tasting/sweetness'
import type { WineType } from '@/lib/tasting/wine-type'
import {
  APPELLATION_TOKENS,
  AWARD_NOTE,
  BLANC_DE_PATTERN,
  BOTTLER_PREFIXES,
  CONNECTORS,
  CONTACT_NOTE,
  DESCRIPTOR_STEMS,
  GRAPE_PLACES,
  GRAPES,
  LEGAL_PATTERNS,
  PRODUCER_NOTE,
  NOT_A_NAME,
  ORIGIN_GRAPE_NAMES,
  REGIONS,
  SWEETNESS_TERMS,
  SWEET_STYLE_TERMS,
  WINE_TYPE_HINTS,
  WINE_TYPE_TERMS,
  WINERY_KEYWORDS,
  type GrapeColour,
  type WineryKeyword,
} from './dictionaries'
import {
  editDistance,
  findAppellations,
  findSite,
  wineryMatchStrength,
  words as foldedWords,
  type AppellationMatch,
  type AppellationRef,
  type SiteRef,
} from './match-reference'
import { cleanLine, displayCase, fold, foldText, letterCount, type Folded } from './normalize'
import { tasteDescription } from './taste'
import type { FieldGuess, GuessSource, LabelSuggestion, OcrLine } from './types'

export type ParseLabelOptions = {
  /** Fuzzy lookup in the winery list; returns the canonical name or null. */
  matchWinery?: (text: string) => string | null
  /** Protected wine names (PDO/PGI) – a name line that is one of them may be filled in. */
  appellations?: readonly AppellationRef[]
  /** Single vineyards – "Piesporter Goldtröpfchen" may be filled in as the name. */
  sites?: readonly SiteRef[]
  /** For tests; defaults to the current year. Vintages up to next year are accepted. */
  currentYear?: number
}

/** Tesseract confidence (0–100) below which a line is ignored. */
export const MIN_CONFIDENCE = 30
/** Confidence a line needs for its value to count as sure. */
export const SURE_CONFIDENCE = 75
/** Confidence a line needs to be considered as the wine's name or producer. */
const NAME_CONFIDENCE = 50
/** Lines with more words are running text, not names. */
const PROSE_WORDS = 6

// Field limits of the wine form (src/lib/validation.ts).
const MAX_NAME = 80
const MAX_WINERY = 80
const MAX_GRAPES = 60
const MAX_DESCRIPTION = 200

type Box = OcrLine['bbox']

// --- term matching ---------------------------------------------------------------------------

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const SEP = "[\\s\\-'·.]*"

/** Regex for a dictionary term on folded text. Separators are optional; "*term" also matches as a word ending. */
export function termRegex(term: string): RegExp {
  const asEnding = term.startsWith('*')
  const body = foldText(asEnding ? term.slice(1) : term)
    .split(/[\s\-'·.]+/)
    .filter(Boolean)
    .map(escapeRegex)
    .join(SEP)
  return new RegExp(`(?<![\\p{L}\\p{N}])${asEnding ? '\\p{L}*' : ''}${body}(?![\\p{L}\\p{N}])`, 'gu')
}

type Compiled<T> = { regex: RegExp; value: T; weak: boolean; term: string }
type Hit<T> = { value: T; weak: boolean; term: string; start: number; end: number; fuzzy?: boolean }

function compile<T>(terms: { term: string; value: T; weak?: boolean }[]): Compiled<T>[] {
  return terms.map((t) => ({ regex: termRegex(t.term), value: t.value, weak: t.weak ?? false, term: t.term }))
}

const mask = (text: string, start: number, end: number) => text.slice(0, start) + '\u0001'.repeat(end - start) + text.slice(end)

/** All non-overlapping hits, earlier terms first (compound terms are listed before their parts). */
function findTerms<T>(folded: string, terms: Compiled<T>[]): Hit<T>[] {
  let masked = folded
  const hits: Hit<T>[] = []
  for (const t of terms) {
    t.regex.lastIndex = 0
    const found = [...masked.matchAll(t.regex)].map((m) => ({ value: t.value, weak: t.weak, term: t.term, start: m.index, end: m.index + m[0].length }))
    for (const h of found) masked = mask(masked, h.start, h.end)
    hits.push(...found)
  }
  return hits.sort((a, b) => a.start - b.start)
}

type FuzzyWord<T> = { word: string; value: T; prefix: boolean }

/**
 * OCR misreads ("Riesting", "rollinger") and cut-off words ("MONTEP"): single words of at least
 * 6 letters within one edit (two from 10 letters), or – where allowed – a long enough prefix.
 * Only words that no exact term matched are tried; a tie between different values is no hit.
 */
function findFuzzy<T>(folded: string, exact: Hit<unknown>[], words: FuzzyWord<T>[]): Hit<T>[] {
  let masked = folded
  for (const h of exact) masked = mask(masked, h.start, h.end)
  const hits: Hit<T>[] = []
  for (const m of masked.matchAll(/\p{L}{6,}/gu)) {
    const token = m[0]
    let best: { value: T; dist: number; word: string } | undefined
    let tie = false
    for (const w of words) {
      const max = w.word.length >= 10 ? 2 : 1
      let dist = editDistance(token, w.word, max)
      if (dist > max && w.prefix && token.length >= Math.max(6, 0.45 * w.word.length) && w.word.startsWith(token)) dist = max
      if (dist > max || dist === 0) continue
      if (!best || dist < best.dist) {
        best = { value: w.value, dist, word: w.word }
        tie = false
      } else if (dist === best.dist && w.value !== best.value) tie = true
    }
    if (best && !tie) hits.push({ value: best.value, weak: true, fuzzy: true, term: best.word, start: m.index, end: m.index + token.length })
  }
  return hits
}

const SWEETNESS = compile(SWEETNESS_TERMS)
const SWEET_STYLES = compile(SWEET_STYLE_TERMS.map((term) => ({ term, value: 'sweet' as const })))
const TYPES = compile(WINE_TYPE_TERMS)
const TYPE_HINTS = compile(WINE_TYPE_HINTS)
const BOTTLERS = compile(BOTTLER_PREFIXES.map((term) => ({ term, value: term })))
const WINERY = compile(WINERY_KEYWORDS.map((k) => ({ term: k.term, value: k })))

type GrapeValue = { canonical: string; colour: GrapeColour; alias: string }
const GRAPE_ALIASES = compile(
  GRAPES.flatMap((g) => g.aliases.map((alias) => ({ term: alias, value: { canonical: g.canonical, colour: g.colour, alias } }))).sort(
    (a, b) => b.term.length - a.term.length,
  ),
)

const singleWords = <T>(terms: { term: string; value: T; weak?: boolean }[], minLength: number, prefix = false): FuzzyWord<T>[] =>
  terms
    .filter((t) => !t.weak)
    .map((t) => ({ word: foldText(t.term.replace(/^\*/, '')), value: t.value, prefix }))
    .filter((w) => /^\p{L}+$/u.test(w.word) && w.word.length >= minLength)

// Short grape names (Merlot, Kerner) are too close to ordinary words for fuzzy matching.
const FUZZY_GRAPES = singleWords(
  GRAPE_ALIASES.map((g) => ({ term: g.term, value: g.value })),
  7,
  true,
)
const FUZZY_SWEETNESS = singleWords(SWEETNESS_TERMS, 7)
const FUZZY_TYPES = singleWords(WINE_TYPE_TERMS, 7)

// --- lines -----------------------------------------------------------------------------------

type Line = {
  /** Position in reading order among the layout lines; -1 for a second reading of the same spot. */
  order: number
  text: string
  f: Folded
  /** Folded text with punctuation as spaces, for the small-print patterns. */
  loose: string
  conf: number
  box: Box
  h: number
  words: number
  legal: boolean
  address: boolean
  prose: boolean
  /** The line as a taste description ("Süß & fruchtig"), or null */
  taste: string | null
}

const VOWEL = /[aeiouy]/

// Short dictionary words that may stand alone on a line ("Sec", "Dry", "Cava").
const SHORT_TERMS = new Set(
  [...SWEETNESS_TERMS, ...WINE_TYPE_TERMS].map((t) => t.term).filter((t) => /^[a-z]{3,4}$/.test(t)),
)

/** A line needs at least one real-looking word: 4+ letters with a vowel, or 3 letters read with high confidence. */
function looksLikeNoise(text: string, conf: number): boolean {
  const letters = letterCount(text)
  if (letters < 2) return true
  const visible = text.replace(/\s/g, '').length
  if (letters / visible < 0.5) return true
  return !text.split(' ').some((t) => {
    const n = letterCount(t)
    const word = foldText(t)
    if (SHORT_TERMS.has(word.replace(/[^\p{L}]/gu, ''))) return true
    return VOWEL.test(word) && n / t.length >= 0.8 && (n >= 4 || (n === 3 && conf >= 80))
  })
}

const ADDRESS_PATTERNS = [
  /(?<![\p{L}])[a-z]{1,2} ?- ?\d{4,5}(?!\d)/u, // D-67146, A-3601, CH-8000
  /(?<!\d)\d{5}(?!\d)/, // German postcode
  /(strasse|str\.|gasse|allee|platz|weg)(?![\p{L}])/u,
  /(?<![\p{L}])(via|rue|calle|road|street|avenue)\s/u,
  /\+\s?\d|(?<![\p{L}])(tel|fax|telefon|phone)(?![\p{L}])|\(0\d+\)/u,
  /\d{3,}[\s/-]\d{3,}/, // phone number groups
  /,\s*\d{4}\s+\p{L}/u, // ", 3601 Dürnstein"
  /(?<![\p{L}])(a\.? ?p\.? ?-? ?nr|apnr|lot|lotto)(?![\p{L}])|prufungsnummer/u,
  /(?<![\p{L}])l[.\s-]+\d/u, // lot number "L 2021", "L.123"
]

function toLine(raw: OcrLine): Line | null {
  if (!(raw.confidence >= MIN_CONFIDENCE)) return null
  const text = cleanLine(raw.text)
  if (!text) return null
  if (yearTokens(text).length === 0 && looksLikeNoise(text, raw.confidence)) return null
  const f = fold(text)
  const loose = f.folded.replace(/[^\p{L}\p{N}%@.]+/gu, ' ').trim()
  const words = text.split(' ').filter((t) => t !== '&').length
  return {
    order: -1,
    text,
    f,
    loose,
    conf: raw.confidence,
    box: raw.bbox,
    h: Math.max(1, raw.bbox.y1 - raw.bbox.y0),
    words,
    legal: LEGAL_PATTERNS.some((p) => p.test(loose)),
    address: ADDRESS_PATTERNS.some((p) => p.test(f.folded)),
    prose: words > PROSE_WORDS,
    taste: tasteDescription(text),
  }
}

const area = (b: Box) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0)

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
  const h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0)
  if (w <= 0 || h <= 0) return 0
  return (w * h) / Math.max(1, Math.min(area(a), area(b)))
}

const sameSpot = (a: Box, b: Box) => a === b || overlap(a, b) > 0.6

const overlapsX = (a: Box, b: Box) => Math.min(a.x1, b.x1) > Math.max(a.x0, b.x0)

/** Vertical gap between two lines (negative when they overlap). */
const gapBetween = (a: Line, b: Line) => Math.max(a.box.y0 - b.box.y1, b.box.y0 - a.box.y1)

/** The layout line right above a line, when it is close enough to belong to it. */
function lineAbove(line: Line, layout: Line[]): Line | undefined {
  const at = layout.find((l) => sameSpot(l.box, line.box))
  const above = at ? layout[at.order - 1] : undefined
  return above && at && overlapsX(above.box, at.box) && gapBetween(above, at) <= Math.max(above.h, at.h) ? above : undefined
}

const readingOrder = <T extends { box: Box }>(a: T, b: T) => a.box.y0 - b.box.y0 || a.box.x0 - b.box.x0

/**
 * Several OCR passes can read the same spot twice. For layout (name, neighbours) only the most
 * confident reading of a spot counts; keyword searches still look at every reading.
 */
function layoutLines(lines: Line[]): Line[] {
  const kept: Line[] = []
  for (const line of [...lines].sort((a, b) => b.conf - a.conf)) {
    if (!kept.some((k) => sameSpot(k.box, line.box))) kept.push(line)
  }
  kept.sort(readingOrder).forEach((line, order) => (line.order = order))
  return kept
}

// --- vintage ---------------------------------------------------------------------------------

type YearToken = { year: number; fixed: boolean; start: number; end: number }

// Four characters of digits or digit look-alikes (O → 0, l/I/| → 1), not part of a date or number.
const YEAR_TOKEN = /(?<![\p{L}\p{N}])(?<!\d[./-])[\dOoIl|]{4}(?![\p{L}\p{N}])(?![./-]\d)/gu

export function yearTokens(text: string): YearToken[] {
  const tokens: YearToken[] = []
  for (const m of text.matchAll(YEAR_TOKEN)) {
    const token = m[0]
    if ((token.match(/\d/g)?.length ?? 0) < 2) continue
    const digits = token.replace(/[Oo]/g, '0').replace(/[Il|]/g, '1')
    if (!/^(19|20)\d\d$/.test(digits)) continue
    tokens.push({ year: Number(digits), fixed: digits !== token, start: m.index, end: m.index + token.length })
  }
  return tokens
}

// Founding words on folded text ("Seit", "Fondé en", "Anno", "dall'"): one list for the vintage
// (FOUNDED_BEFORE) and for the name candidates (FOUNDED).
const FOUNDING_WORDS = 'seit|since|depuis|dal|dall|desde|est|gegr|gegrundet|founded|established|fondata|fondato|fonde|fondee|anno'
const FOUNDED_BEFORE = new RegExp(String.raw`(?<![\p{L}])(${FOUNDING_WORDS})\.?\s*(im jahre?|en|in|nel)?\s*$`, 'u')
const VINTAGE_WORD = /(?<![\p{L}])(jahrgang|vintage|millesime|vendemmia|cosecha|anada|annata|colheita)(?![\p{L}])/u

/**
 * A medal sticker read as separate lines ("DLG" / "2024" / "GOLD"): a line of about the same size
 * right next to the year names an award and has no year of its own.
 */
function nextToAward(line: Line, awards: Line[]): boolean {
  return awards.some(
    (other) =>
      other !== line &&
      !sameSpot(other.box, line.box) &&
      Math.min(other.h, line.h) / Math.max(other.h, line.h) >= 0.6 &&
      overlapsX(other.box, line.box) &&
      gapBetween(other, line) <= 1.5 * Math.max(other.h, line.h),
  )
}

function findVintage(lines: Line[], layout: Line[], currentYear: number): FieldGuess<number> | undefined {
  type Candidate = { year: number; fixed: boolean; strong: boolean; line: Line }
  const candidates: Candidate[] = []
  const awards = lines.filter((l) => AWARD_NOTE.test(l.f.folded))
  const awardsWithoutYear = awards.filter((l) => yearTokens(l.text).length === 0)
  const possible = (t: YearToken) => t.year >= 1950 && t.year <= currentYear + 1
  // A medal or founding year was set aside: the rules may have picked the wrong year, so the one
  // left over is only suggested.
  let setAside = false
  for (const line of lines) {
    if (line.address) continue
    // Medal and competition years are never the vintage, wherever the real one is.
    if (awards.includes(line) || nextToAward(line, awardsWithoutYear)) {
      if (yearTokens(line.text).some(possible)) setAside = true
      continue
    }
    for (const t of yearTokens(line.text)) {
      if (!possible(t)) continue
      const before = foldText(line.text.slice(0, t.start))
      if (FOUNDED_BEFORE.test(before)) {
        setAside = true
        continue
      }
      // "SEIT" / "1962": the founding word on the line above
      if (letterCount(before) === 0) {
        const above = lineAbove(line, layout)
        if (above && FOUNDED_BEFORE.test(above.f.folded.trimEnd())) {
          setAside = true
          continue
        }
      }
      const rest = foldText(line.text.slice(0, t.start) + ' ' + line.text.slice(t.end)).replace(new RegExp(VINTAGE_WORD.source, 'gu'), ' ')
      candidates.push({ year: t.year, fixed: t.fixed, strong: VINTAGE_WORD.test(line.f.folded) || letterCount(rest) === 0, line })
    }
  }
  if (candidates.length === 0) return undefined
  const best = [...candidates].sort(
    (a, b) =>
      Number(b.strong) - Number(a.strong) ||
      Number(a.fixed) - Number(b.fixed) ||
      b.line.h - a.line.h ||
      b.line.conf - a.line.conf,
  )[0]
  const distinct = new Set(candidates.map((c) => c.year)).size
  const sure = distinct === 1 && !setAside && !best.fixed && !best.line.prose && best.line.conf >= SURE_CONFIDENCE
  return { value: best.year, sure }
}

// --- keyword fields --------------------------------------------------------------------------

type LineHit<T> = Hit<T> & { line: Line }

function scan<T>(lines: Line[], terms: Compiled<T>[], fuzzy: FuzzyWord<T>[] = []): LineHit<T>[] {
  return lines.flatMap((line) => {
    const exact = findTerms(line.f.folded, terms)
    const close = fuzzy.length > 0 ? findFuzzy(line.f.folded, exact, fuzzy) : []
    return [...exact, ...close].map((hit) => ({ ...hit, line }))
  })
}

const prominence = <T>(a: LineHit<T>, b: LineHit<T>) => b.line.h - a.line.h || b.line.conf - a.line.conf
const strongHit = <T>(h: LineHit<T>) => !h.weak && !h.line.prose && h.line.conf >= SURE_CONFIDENCE

/** Picks the most prominent hit; sure only for one unambiguous, confident value. */
function decide<T>(hits: LineHit<T>[]): FieldGuess<T> | undefined {
  if (hits.length === 0) return undefined
  const strong = hits.filter(strongHit)
  const pool = strong.length > 0 ? strong : hits
  const best = [...pool].sort(prominence)[0]
  const sure = strong.length > 0 && new Set(strong.map((h) => h.value)).size === 1
  return { value: best.value, sure }
}

// "13,5 % vol", "12.5%vol.", "13.5% by vol", "13% ABV" – and "Alc. 13 %", "Alkoholgehalt: 11,5 %".
const ALCOHOL_NUMBER = String.raw`(\d{1,2})(?:\s?[.,]\s?(\d{1,2}))?`
const ALCOHOL_PATTERNS = [
  new RegExp(String.raw`(?<![\d.,])${ALCOHOL_NUMBER}\s?%\s?(?:(?:by\s)?vol\b|alc\b|alk\b|abv\b)`, 'giu'),
  new RegExp(String.raw`\b(?:alc|alk|alcohol|alkohol|alkoholgehalt|alcool|alcol)\b\.?\s*:?\s*${ALCOHOL_NUMBER}\s?%`, 'giu'),
]

// Before the number: a one- or two-digit fragment and a space ("13 5 % vol", "1 3,5 % vol" – OCR
// may have lost the comma) or an upper limit ("alkoholfrei < 0,5 % vol", "max. 0,5 %") – the value
// may be wrong, so only a suggestion. A vintage or volume before it ("2021 12,5 % vol") is fine.
const ALCOHOL_DOUBTFUL_BEFORE = /(?:(?<!\d)\d{1,2}\s|(?:<|≤|\bunter|\bmax\.?|\bbis|\bweniger als|\bless than|\bunder)\s*)$/iu

/**
 * Alcohol by volume. Works on the raw OCR lines: the cleaned lines drop what is mostly digits.
 * Only a percentage marked as alcohol counts ("100 % Riesling" is not one). Sure when read well,
 * not doubtful and the label shows only one value.
 */
function findAlcohol(lines: OcrLine[]): FieldGuess<number> | undefined {
  const hits: { value: number; conf: number; doubtful: boolean }[] = []
  for (const line of lines) {
    for (const pattern of ALCOHOL_PATTERNS) {
      for (const m of line.text.matchAll(pattern)) {
        const value = Math.round(Number(`${m[1]}.${m[2] ?? '0'}`) * 10) / 10
        if (value < MIN_ALCOHOL || value > MAX_ALCOHOL) continue
        const numberStart = m.index + m[0].search(/\d/)
        const doubtful = ALCOHOL_DOUBTFUL_BEFORE.test(line.text.slice(0, numberStart))
        hits.push({ value, conf: line.confidence, doubtful })
      }
    }
  }
  if (hits.length === 0) return undefined
  const { value } = hits[0]
  const agreed = hits.every((h) => h.value === value && !h.doubtful)
  return { value, sure: agreed && hits.some((h) => h.conf >= SURE_CONFIDENCE) }
}

function findSweetness(lines: Line[]): FieldGuess<Sweetness> | undefined {
  const explicit = decide(scan(lines, SWEETNESS, FUZZY_SWEETNESS))
  if (explicit) return explicit
  // Styles only count in short headlines: "a late harvest and the result is" is a story, not the style.
  const style = scan(lines, SWEET_STYLES).filter((h) => h.line.words <= 4)
  return style.length > 0 ? { value: 'sweet', sure: false } : undefined
}

type GrapeHit = GrapeValue & { written: string; line: Line; start: number; end: number; fuzzy: boolean }

function findGrapeHits(lines: Line[], layout: Line[]): GrapeHit[] {
  return scan(lines, GRAPE_ALIASES, FUZZY_GRAPES)
    .map((hit) => {
      // Exact hits keep the label's spelling; a misread is replaced by the dictionary spelling.
      const slice = hit.line.text.slice(hit.line.f.map[hit.start], hit.line.f.map[hit.end])
      const written = hit.fuzzy ? hit.value.alias : displayCase(slice)
      return { ...hit.value, written, line: hit.line, start: hit.start, end: hit.end, fuzzy: hit.fuzzy ?? false }
    })
    .filter((hit) => !inSmallPrint(hit) && !isPlace(hit, layout))
}

/**
 * Grape names in the producer's small print are its name or town: "Erzeugerabfüllung Weingut
 * Kerner, D-55234 …", "Imbottigliato da …, Montepulciano (SI)". Address and contact lines count
 * fully, bottling notes from the note on ("Riesling Qualitätswein · Gutsabfüllung" keeps Riesling).
 */
function inSmallPrint(hit: GrapeHit): boolean {
  const { line } = hit
  if (line.address || CONTACT_NOTE.test(line.loose)) return true
  const note = PRODUCER_NOTE.exec(line.f.folded)
  return note !== null && note.index <= hit.start
}

/** "Vino Nobile di Montepulciano", "Saint-Laurent-Médoc": the place, not the grape. */
function isPlace(hit: GrapeHit, layout: Line[]): boolean {
  const rule = GRAPE_PLACES.find((p) => p.grape === hit.canonical)
  if (!rule) return false
  const after = hit.line.f.folded.slice(hit.end)
  if (rule.keep?.test(after)) return false
  if (rule.after?.test(after)) return true
  if (!rule.before) return false
  const before = hit.line.f.folded.slice(0, hit.start).trimEnd()
  if (before) return rule.before.test(before)
  // At the start of the line: the end of the line above ("VINO NOBILE DI" / "MONTEPULCIANO")
  const above = lineAbove(hit.line, layout)
  return above !== undefined && rule.before.test(above.f.folded.trimEnd())
}

const GRAPE_BY_ALIAS = new Map(GRAPE_ALIASES.map((g) => [foldedWords(g.term).join(' '), g.value]))

/**
 * A grape name set over two lines is one grape, not two: "CABERNET" / "SAUVIGNON", and also
 * "ROTER" / "VELTLINER", which is not the "Veltliner" (Grüner Veltliner) of the second line alone.
 */
function joinSplitGrapes(hits: GrapeHit[], layout: Line[]): GrapeHit[] {
  const whole = (h: GrapeHit) => h.line.order >= 0 && h.start === 0 && h.end === h.line.f.folded.length
  const out = [...hits]
  for (const a of hits) {
    const b = hits.find((h) => whole(a) && whole(h) && h.line.order === a.line.order + 1)
    if (!b) continue
    const joined = GRAPE_BY_ALIAS.get(`${foldedWords(a.alias).join(' ')} ${foldedWords(b.alias).join(' ')}`)
    if (!joined || !out.includes(a) || !out.includes(b)) continue
    out.splice(out.indexOf(a), 1, { ...joined, written: `${a.written} ${b.written}`, line: a.line, start: a.start, end: a.end, fuzzy: a.fuzzy || b.fuzzy })
    out.splice(out.indexOf(b), 1)
  }
  for (const b of [...out]) {
    if (!whole(b)) continue
    const a = layout[b.line.order - 1]
    if (!a || lineAbove(b.line, layout) !== a || hits.some((h) => h.line === a) || a.words > 2) continue
    const joined = GRAPE_BY_ALIAS.get(`${foldedWords(a.text).join(' ')} ${foldedWords(b.alias).join(' ')}`)
    if (!joined) continue
    const line = a.conf < b.line.conf ? a : b.line
    out.splice(out.indexOf(b), 1, { ...joined, written: `${displayCase(a.text)} ${b.written}`, line, start: 0, end: line.f.folded.length, fuzzy: b.fuzzy })
  }
  return out
}

function findGrapes(hits: GrapeHit[]): FieldGuess<string> | undefined {
  // One entry per variety (synonyms count once), in reading order, spelled as on the best reading.
  const byGrape = new Map<string, GrapeHit[]>()
  for (const hit of [...hits].sort((a, b) => readingOrder(a.line, b.line) || a.start - b.start)) {
    byGrape.set(hit.canonical, [...(byGrape.get(hit.canonical) ?? []), hit])
  }
  if (byGrape.size === 0) return undefined
  const chosen = [...byGrape.values()].map(
    (group) => [...group].sort((a, b) => Number(a.fuzzy) - Number(b.fuzzy) || b.line.conf - a.line.conf)[0],
  )
  let value = ''
  for (const hit of chosen) {
    const next = value ? `${value}, ${hit.written}` : hit.written
    if (next.length > MAX_GRAPES) break
    value = next
  }
  const sure = chosen.every((h) => !h.fuzzy && h.line.conf >= SURE_CONFIDENCE && !h.line.prose)
  return { value, sure }
}

// --- criteria: wine type and grape -----------------------------------------------------------
//
// Which evidence fills in the wine type and the grape (sure) and which is only offered (a
// suggestion to tap). Rather empty than wrong: whatever is printed on the label wins over what an
// appellation implies, and evidence that disagrees gives no sure value. The rules are tried in
// order; the first one that gives a value decides. A poorly read word is still sure when a clearly
// read appellation says the same.
//
// "Clearly read" (sure): confidence ≥ SURE_CONFIDENCE, not running text; an appellation also spelled
// exactly or filling most of its line (APPELLATION_COVERAGE); a one-word appellation, often also a
// town ("Dogliani", "Aversa"), in addition set at least half as large as the largest line or named
// with a designation ("DOCG", "Premier Cru", also on the line below). Appellations only count
// outside the producer's lines (unless the line is nothing but the appellation: "Domaine" /
// "CHABLIS"), address, contact and bottling note ("Imbottigliato da …, Barolo" is a town), and
// never as the end of a longer name set over two lines ("BARBERA" / "d'Asti" is not Asti). An
// appellation read less clearly only gives suggestions.
//
// | Field | Evidence                                                          | Result             |
// |-------|-------------------------------------------------------------------|--------------------|
// | type  | sparkling term ("Sekt", "Crémant", "brut")                        | sure if clear      |
// | type  | "Blanc de Noirs" / "Blanc de Blancs" → white (over red grapes)    | sure if clear      |
// | type  | type word ("Rotwein", "Rosé", "Bianco")                           | sure if clear      |
// | type  | appellation that allows one colour (Chablis → white)              | sure if clear, no  |
// |       |                                                                   | appellation and no |
// |       |                                                                   | printed grape      |
// |       |                                                                   | disagrees          |
// | type  | printed grapes all of one colour                                  | suggestion         |
// |       |                                                                   | "aus der Rebsorte" |
// | type  | no printed grape, the appellation's typical grapes of one colour  | suggestion         |
// |       |                                                                   | "aus der Herkunft" |
// | type  | method or region word ("Appassimento", "Chianti")                 | suggestion         |
// | grape | printed grape                                                     | sure if clear, or  |
// |       |                                                                   | if it is the sure  |
// |       |                                                                   | main grape below   |
// | grape | appellation requiring ≥ 85 % of one grape (Barolo → Nebbiolo),    | sure, only when    |
// |       | colour fixed by the appellation or by a sure type of the grape's  | no grape printed   |
// |       | colour (Sancerre Blanc → Sauvignon Blanc), no appellation         |                    |
// |       | disagrees, no "Blanc de Noirs" (red grapes) on a white main grape |                    |
// | grape | typical grapes of the appellation (Rioja → Tempranillo, …), at    | suggestion         |
// |       | most 3, only grapes of the colour the label fixes                 | "aus der Herkunft" |
//
// Grapes from the appellation are named as in its country
// (ORIGIN_GRAPE_NAMES: "Pinot Noir" for a Sancerre); printed grapes keep the label's spelling.
// Sweetness has no rules from appellations.

/** What the type and grape rules look at. */
type Evidence = {
  lines: Line[]
  /** Grapes printed on the label (also unsure readings) */
  printedGrapes: GrapeHit[]
  /** Appellations on the label, in reading order */
  origins: Origin[]
}

/** An appellation found on the label; `clear` when read clearly enough for a sure value. */
type Origin = { ref: AppellationRef; clear: boolean }

type TypeRule = { criterion: string; decide: (e: Evidence) => FieldGuess<WineType> | undefined }

const GRAPE_COLOUR = new Map<string, GrapeColour>(GRAPES.map((g) => [g.canonical, g.colour]))

/** One colour for all known grapes, or undefined (none known, or both colours). */
function colourOf(canonicals: string[]): GrapeColour | undefined {
  const colours = new Set(canonicals.flatMap((c) => GRAPE_COLOUR.get(c) ?? []))
  return colours.size === 1 ? [...colours][0] : undefined
}

const guess = <T>(value: T, sure: boolean, from?: GuessSource): FieldGuess<T> => (from ? { value, sure, from } : { value, sure })

function typeTermHits(lines: Line[]): LineHit<WineType>[] {
  return (
    scan(lines, TYPES, FUZZY_TYPES)
      .map((hit) => {
        // "ROSE" without accent may just be a word; "rosé" is the wine.
        if (hit.term === 'rose' && !hit.fuzzy) {
          const written = hit.line.text.slice(hit.line.f.map[hit.start], hit.line.f.map[hit.end])
          return { ...hit, weak: !/[éÉ]/.test(written) }
        }
        return hit
      })
      // Bare "red"/"white" in running text is a tasting note ("red berries"), not the wine.
      .filter((hit) => !(hit.weak && hit.line.prose))
  )
}

/** "Blanc de Noirs" / "Blanc de Blancs", valued by the colour of the grapes (the wine is white). */
function blancDeHits(lines: Line[]): LineHit<GrapeColour>[] {
  return lines.flatMap((line) =>
    [...line.f.folded.matchAll(BLANC_DE_PATTERN)].map((m) => ({
      value: m[1].startsWith('n') ? ('red' as const) : ('white' as const),
      weak: false,
      term: 'blanc de',
      start: m.index,
      end: m.index + m[0].length,
      line,
    })),
  )
}

const WINE_TYPE_RULES: TypeRule[] = [
  {
    criterion: 'sparkling term → sparkling, sure if clear',
    decide: ({ lines }) => {
      const sparkling = typeTermHits(lines).filter((h) => h.value === 'sparkling')
      return sparkling.length > 0 ? guess<WineType>('sparkling', sparkling.some(strongHit)) : undefined
    },
  },
  {
    criterion: '"Blanc de Noirs" / "Blanc de Blancs" → white, sure if clear',
    decide: ({ lines }) => decide(blancDeHits(lines).map((h) => ({ ...h, value: 'white' as const }))),
  },
  {
    criterion: 'type word → that type, sure if clear and unambiguous',
    decide: ({ lines }) => decide(typeTermHits(lines)),
  },
  {
    criterion: 'appellation of one colour → that type, sure if clear, no appellation and no printed grape disagrees',
    decide: (e) => originType(e),
  },
  {
    criterion: 'printed grapes of one colour → suggestion "aus der Rebsorte"',
    decide: ({ printedGrapes }) => {
      const colour = colourOf(printedGrapes.map((g) => g.canonical))
      return colour ? guess<WineType>(colour, false, 'grape') : undefined
    },
  },
  {
    criterion: 'no printed grape, typical grapes of the appellation of one colour → suggestion "aus der Herkunft"',
    decide: ({ printedGrapes, origins }) => {
      if (printedGrapes.length > 0) return undefined
      const colour = colourOf(origins.flatMap((o) => o.ref.grapes ?? []))
      return colour ? guess<WineType>(colour, false, 'origin') : undefined
    },
  },
  {
    criterion: 'method or region word → suggestion',
    decide: ({ lines }) => {
      const hits = lines.flatMap((line) => findTerms(originText(line) ?? '', TYPE_HINTS).map((h) => ({ ...h, line })))
      const hint = hits.sort(prominence)[0]
      return hint ? guess<WineType>(hint.value, false) : undefined
    },
  },
]

/** Whether grapes of this colour make this type: rosé and red from red grapes, sparkling from both. */
const madeFrom = (type: WineType, colour: GrapeColour) =>
  type === 'sparkling' || (type === 'white' ? colour === 'white' : colour === 'red')

/**
 * The one type the appellations allow; undefined when none says, they disagree, or a printed grape
 * is of the other colour (Barolo with "Chardonnay": something was misread).
 */
function originType({ origins, printedGrapes }: Evidence): FieldGuess<WineType> | undefined {
  const typed = origins.filter((o) => o.ref.wineType)
  const types = new Set(typed.map((o) => o.ref.wineType))
  if (types.size !== 1) return undefined
  const type = [...types][0]!
  const colours = printedGrapes.flatMap((g) => GRAPE_COLOUR.get(g.canonical) ?? [])
  if (colours.some((c) => !madeFrom(type, c))) return undefined
  return guess(type, typed.some((o) => o.clear), 'origin')
}

function findWineType(e: Evidence): FieldGuess<WineType> | undefined {
  for (const rule of WINE_TYPE_RULES) {
    const found = rule.decide(e)
    if (!found) continue
    // A poorly read type word that a clearly read appellation confirms ("Prosecco", "spumante")
    const origin = found.sure || found.from ? undefined : originType(e)
    return origin?.sure && origin.value === found.value ? origin : found
  }
  return undefined
}

/** The part of a line that may name the wine's origin: not the producer's address, contact or bottling note. */
function originText(line: Line): string | null {
  if (line.prose || line.address || line.conf < NAME_CONFIDENCE || CONTACT_NOTE.test(line.loose)) return null
  const note = PRODUCER_NOTE.exec(line.f.folded)
  return note ? line.f.folded.slice(0, note.index) : line.f.folded
}

// Words that tie a line to the one above: "BARBERA" / "d'Asti", "VIN SANTO" / "DI CARMIGNANO".
const ORIGIN_LINKS = new Set(['d', 'di', 'de', 'del', 'dell', 'della', 'dello', 'dei', 'degli', 'delle', 'du', 'des', 'da', 'dal'])

// Words that make a one-word appellation the wine's designation, not a town: "Dogliani DOCG",
// "Chablis Premier Cru", "Appellation Morgon Contrôlée".
const DESIGNATION_WORDS = new Set([
  'doc', 'docg', 'igt', 'igp', 'aoc', 'aop', 'do', 'dop', 'doca', 'docq', 'pdo', 'pgi', 'dac',
  'appellation', 'denominazione', 'denominacion', 'controlee', 'controllata', 'garantita', 'protegee', 'protetta',
  'cru', 'classico', 'superiore', 'riserva', 'villages',
])

/** Folded words with their positions, split like `words()` of match-reference. */
const wordSpans = (folded: string) => [...folded.matchAll(/[\p{L}\p{N}]+/gu)].map((m) => ({ start: m.index, end: m.index + m[0].length }))

/** "CHASSACNF-MONTRACHET": the match is the second half of a longer, misread name. */
function hyphenated(folded: string, m: AppellationMatch): boolean {
  if (m.start === 0) return false
  const spans = wordSpans(folded)
  return folded.slice(spans[m.start - 1].end, spans[m.start].start) === '-'
}

/** Two word lists, the second inside the first: "vin santo di carmignano" contains "carmignano". */
function containsWords(outer: string[], inner: string[]): boolean {
  for (let i = 0; i + inner.length <= outer.length; i++) if (inner.every((w, k) => outer[i + k] === w)) return true
  return false
}

/**
 * Appellations on the label, outside the producer's lines; also those set over two lines. Clear
 * (good for a sure value): read with high confidence, and either spelled exactly or filling the
 * line ("CHABLIS" read as "CHABUS" is still Chablis; one misread word in a long line is not). A
 * one-word appellation is often also a town ("Dogliani", "Aversa"): it is clear only when set at
 * least half as large as the largest line or named with a designation ("DOCG", "Premier Cru").
 */
function findOrigins(lines: Line[], layout: Line[], groups: Group[], list: readonly AppellationRef[], producer: (l: Line) => boolean): Origin[] {
  if (list.length === 0) return []
  const confident = lines.filter((l) => l.conf >= NAME_CONFIDENCE)
  const largest = Math.max(0, ...(confident.length > 0 ? confident : lines).map((l) => l.h))
  const whole = (l: Line) => !producer(l) && originText(l) === l.f.folded
  // The end of a name begun on the line above: "d'Asti" is not Asti, "MONTRACHET" after "CHASSAGNE-" not Montrachet
  const linked = (text: string) => ORIGIN_LINKS.has(foldedWords(text)[0] ?? '')
  const afterHyphen = (above: Line | undefined) => above !== undefined && above.f.folded.trimEnd().endsWith('-')
  // A designation of its own right under the appellation: "DOGLIANI" / "Denominazione di Origine Controllata"
  const designationBelow = (l: Line) => {
    const below = layout.find((b) => lineAbove(b, layout) === l)
    const ws = below ? foldedWords(below.f.folded) : []
    return ws.length > 0 && ws.some((w) => DESIGNATION_WORDS.has(w)) && ws.every((w) => DESIGNATION_WORDS.has(w) || ORIGIN_LINKS.has(w) || w === 'e' || w === 'origine' || w === 'origen')
  }
  // A producer line counts only when it is nothing but an appellation: "Domaine" / "CHABLIS"
  const onlyAppellation = (m: AppellationMatch) => m.extra === 0 && m.coverage >= APPELLATION_COVERAGE

  const found: { ref: AppellationRef; clear: boolean; lines: Line[] }[] = []
  const look = (text: string, conf: number, from: Line[], skip: (m: AppellationMatch) => boolean = () => false) => {
    const designated = foldedWords(text).some((w) => DESIGNATION_WORDS.has(w)) || designationBelow(from[from.length - 1])
    const prominent = from.some((l) => l.h >= 0.5 * largest)
    for (const m of findAppellations(text, list)) {
      if (skip(m)) continue
      const oneWord = foldedWords(m.ref.name).length === 1
      const read = conf >= SURE_CONFIDENCE && (m.exact || m.coverage >= APPELLATION_COVERAGE)
      found.push({ ref: m.ref, clear: read && (!oneWord || prominent || designated), lines: from })
    }
  }
  for (const line of lines) {
    const inProducer = producer(line)
    const text = originText(line)
    if (!text) continue
    const above = lineAbove(line, layout)
    const link = linked(text)
    const hyphen = afterHyphen(above)
    look(text, line.conf, [line], (m) =>
      (inProducer && !onlyAppellation(m)) || (link && m.start === 1) || (hyphen && m.start === 0) || hyphenated(text, m),
    )
    if ((link || hyphen) && above && whole(above) && whole(line)) {
      look(`${above.f.folded} ${text}`, Math.min(above.conf, line.conf), [above, line])
    }
  }
  for (const g of groups) {
    const first = g.lines[0]
    const continued = linked(first.f.folded) || afterHyphen(lineAbove(first, layout))
    if (g.lines.length > 1 && !continued && g.lines.every(whole)) look(g.text, g.conf, g.lines)
  }
  // A part of a longer name read over several lines: "Chianti" of "Vin Santo del Chianti"
  const longer = (f: (typeof found)[number]) =>
    found.some(
      (o) =>
        o.lines.length > 1 &&
        o.ref !== f.ref &&
        f.lines.some((l) => o.lines.includes(l)) &&
        containsWords(foldedWords(o.ref.name), foldedWords(f.ref.name)),
    )
  return found.filter((f) => !longer(f)).map(({ ref, clear }) => ({ ref, clear }))
}

/** The grape's name in the appellation's country: "Pinot Noir" for a Sancerre, not "Spätburgunder". */
const originGrapeName = (canonical: string, country: string) =>
  ORIGIN_GRAPE_NAMES[canonical]?.[country.toUpperCase()] ?? ORIGIN_GRAPE_NAMES[canonical]?.['*'] ?? canonical

/**
 * The colour of the grapes, when the label fixes it: "Blanc de Noirs" is white wine from red
 * grapes, "Blanc de Blancs" from white ones; otherwise a sure still type (rosé is made from red
 * grapes). Undefined when unknown, also for a "Blanc de …" read poorly.
 */
function grapeColourOnLabel(lines: Line[], type: FieldGuess<WineType> | undefined): GrapeColour | undefined {
  const blancDe = decide(blancDeHits(lines))
  if (blancDe) return blancDe.sure ? blancDe.value : undefined
  if (!type?.sure || type.value === 'sparkling') return undefined
  return type.value === 'white' ? 'white' : 'red'
}

/**
 * Whether the colour of the wine is fixed for the main grape: by the appellation itself, or by
 * the label showing the grape's colour (Sancerre Blanc → Sauvignon Blanc). A sure type or grape
 * colour that contradicts the appellation means something was misread (or the main grape does
 * not apply: a "Blanc de Noirs" is not made from the white main grape).
 */
function colourFixed(ref: AppellationRef, main: string, type: FieldGuess<WineType> | undefined, grapeColour: GrapeColour | undefined): boolean {
  const mainColour = GRAPE_COLOUR.get(main)
  if (grapeColour && grapeColour !== mainColour) return false
  const sureType = type?.sure ? type.value : undefined
  if (ref.wineType) return !sureType || sureType === ref.wineType
  return grapeColour !== undefined
}

type OriginGrapes = { grapeVariety?: FieldGuess<string>; grapeCandidates?: string[] }

/**
 * The grape the clearly read appellations require (≥ 85 %), as a sure value: all of them name the
 * same main grape, every other appellation allows it, and the colour is fixed (see criteria above).
 */
function sureMainGrape(
  origins: Origin[],
  type: FieldGuess<WineType> | undefined,
  grapeColour: GrapeColour | undefined,
): { canonical: string; guess: FieldGuess<string> } | undefined {
  const withMain = origins.filter((o) => o.clear && o.ref.mainGrape)
  const mains = new Set(withMain.map((o) => o.ref.mainGrape))
  if (mains.size !== 1) return undefined
  const main = [...mains][0]!
  const agree = origins.every((o) => !o.ref.grapes || o.ref.grapes.includes(main))
  if (!agree || !withMain.every((o) => colourFixed(o.ref, main, type, grapeColour))) return undefined
  return { canonical: main, guess: guess(truncate(originGrapeName(main, withMain[0].ref.country), MAX_GRAPES), true, 'origin') }
}

/**
 * A poorly read printed grape is sure when it is exactly the main grape the appellation requires
 * ("NTEPULCIANO" under a clear "Montepulciano d'Abruzzo"); otherwise it stays as read.
 */
function confirmPrintedGrape(
  printed: FieldGuess<string>,
  hits: GrapeHit[],
  origins: Origin[],
  type: FieldGuess<WineType> | undefined,
  grapeColour: GrapeColour | undefined,
): FieldGuess<string> {
  if (printed.sure) return printed
  const main = sureMainGrape(origins, type, grapeColour)
  return main && hits.every((h) => h.canonical === main.canonical) ? main.guess : printed
}

/** Grape from the appellations, only when no grape is printed (see criteria above). */
function grapesFromOrigin(origins: Origin[], type: FieldGuess<WineType> | undefined, grapeColour: GrapeColour | undefined): OriginGrapes {
  const main = sureMainGrape(origins, type, grapeColour)
  if (main) return { grapeVariety: main.guess }
  // Only grapes of the colour the label shows: Sancerre Rouge → Pinot Noir, not Sauvignon Blanc
  const names = origins.flatMap((o) =>
    (o.ref.grapes ?? [])
      .filter((g) => !grapeColour || (GRAPE_COLOUR.get(g) ?? grapeColour) === grapeColour)
      .map((g) => truncate(originGrapeName(g, o.ref.country), MAX_GRAPES)),
  )
  const candidates = [...new Set(names)].slice(0, MAX_CANDIDATES)
  return candidates.length > 0 ? { grapeCandidates: candidates } : {}
}

// --- plausible words -------------------------------------------------------------------------

// Two-letter starts that real words in German, English, French, Italian and Spanish have.
const ONSETS = new Set([
  'bl', 'br', 'ch', 'cl', 'cr', 'dr', 'fl', 'fr', 'gl', 'gn', 'gr', 'kl', 'kn', 'kr', 'ph', 'pf', 'pl', 'pr',
  'ps', 'qu', 'rh', 'sc', 'sh', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'sv', 'sw', 'sz', 'th', 'tr', 'ts', 'tw', 'vl',
  'vr', 'wh', 'wr', 'zw', 'xi', 'gh',
])

// Words a name may contain even when they are short or look odd.
const BASE_WORDS = new Set<string>([
  ...['di', 'de', 'del', 'della', 'delle', 'dei', 'da', 'dal', 'du', 'des', 'la', 'le', 'les', 'il', 'lo', 'el', 'los', 'las'],
  ...['von', 'vom', 'van', 'der', 'den', 'am', 'im', 'an', 'auf', 'zu', 'zum', 'zur', 'st', 'dr', 'gg', 'san', 'sant', 'santa', 'santo'],
  ...['mit', 'und', 'and', 'et', 'e', 'y', 'of', 'the', 'en', 'au', 'aux', 'sur', 'sous', 'd', 'l', 'vin', 'vino', 'wein'],
  ...['kabinett', 'spatlese', 'auslese', 'classic', 'selection', 'reserva', 'gran', 'crianza', 'riserva', 'classico'],
  ...['superiore', 'reserve', 'grand', 'cru', 'premier', 'vieilles', 'vignes', 'alte', 'reben', 'cuvee', 'tradition'],
])

const known = new WeakMap<object, Set<string>>()
const NO_LIST: readonly never[] = []

function vocabulary(options: ParseLabelOptions): Set<string> {
  const key = options.appellations ?? NO_LIST
  let set = known.get(key)
  if (!set) {
    set = new Set(BASE_WORDS)
    for (const g of GRAPES) for (const alias of g.aliases) for (const w of foldedWords(alias)) set.add(w)
    for (const t of [...SWEETNESS_TERMS, ...WINE_TYPE_TERMS, ...WINE_TYPE_HINTS]) for (const w of foldedWords(t.term)) set.add(w)
    for (const k of WINERY_KEYWORDS) for (const w of foldedWords(k.term)) set.add(w)
    for (const r of REGIONS) for (const w of r.split(' ')) set.add(w)
    for (const a of options.appellations ?? []) for (const w of foldedWords(a.name)) set.add(w)
    known.set(key, set)
  }
  return set
}

/**
 * Whether an unknown word looks like a word and not like OCR debris: 4+ letters, a vowel, no
 * impossible start ("mpos", "rttemberg") and no consonant run longer than German allows ("rnfxk").
 */
function wordLike(word: string): boolean {
  if (word.length < 4 || !/[aeiouy]/.test(word)) return false
  if (/(.)\1\1/.test(word)) return false
  if (!/^[aeiouy]/.test(word) && !/^[^aeiouy][aeiouy]/.test(word) && !ONSETS.has(word.slice(0, 2))) return false
  const squashed = word.replace(/sch|ch|ck|ph|th|sh|gh/g, 'C')
  if (/[^aeiouy]{5,}/.test(squashed)) return false
  const vowels = word.match(/[aeiouy]/g)?.length ?? 0
  return vowels / word.length >= 0.2
}

/**
 * Text that is worth offering as a name or producer: every word is a known word or looks like
 * one, and unknown words need a clear reading. "chel", "chi", "Mpos" and "Sv Af" never pass.
 * `unknownConf`: the confidence unknown words need (lower inside a group that is read well).
 */
function plausible(text: string, conf: number, vocab: Set<string>, unknownConf = SURE_CONFIDENCE, shortConf = 85): boolean {
  const ws = foldedWords(text).filter((w) => !/^\d+$/.test(w))
  if (ws.length === 0 || conf < 60) return false
  if (!ws.some((w) => w.length >= 4)) return false
  const ok = (w: string) =>
    vocab.has(w) ||
    // Four letters are easily debris ("Deng", "chel"): they need a very clear reading.
    (conf >= (w.length === 4 ? shortConf : unknownConf) && wordLike(w)) ||
    // A short word next to a real one: "Camp del Gal", "Vin de Pay".
    (w.length === 3 && conf >= 80 && /[aeiouy]/.test(w) && ws.some((o) => o.length >= 4 && o !== w))
  return ws.every(ok)
}

// --- winery ----------------------------------------------------------------------------------

const STOP_START = new Set(['am', 'im', 'an', 'der', 'die', 'das', 'des', 'von', 'vom', 'zu', 'zum', 'zur', 'the', 'of', 'in', 'auf', 'bei', 'und', 'and', 'de', 'di', 'du', 'la', 'le'])

const squash = (s: string) => foldText(s).replace(/[^\p{L}\p{N}]/gu, '')

const trimJunk = (s: string) => s.replace(/\s+/g, ' ').replace(/^[\s,:;·|\-–]+|[\s,:;·|\-–]+$/g, '').trim()

/** Cuts address and contact parts: "Weingut Müller, D-67146 Deidesheim" → "Weingut Müller". */
function cutAtAddress(text: string): string {
  return trimJunk(text.split(/,|;|\s[-–·|]\s|\s(?=[A-Z]{1,2}-\d)|\s(?=\d)/)[0] ?? '')
}

function keywordFree(text: string): string {
  const f = fold(text)
  let rest = f.folded
  for (const h of findTerms(f.folded, WINERY)) rest = mask(rest, h.start, h.end)
  return rest
    .split(/[\s\u0001]+/)
    .filter((w) => w && !CONNECTORS.has(w) && letterCount(w) > 0)
    .join(' ')
}

/** Removes a strippable keyword ("Weingut") when a meaningful name remains. */
function stripKeyword(text: string): string {
  const f = fold(text)
  const hit = findTerms(f.folded, WINERY).find((h) => !h.value.keep)
  if (!hit) return text
  const rest = trimJunk(text.slice(0, f.map[hit.start]) + ' ' + text.slice(f.map[hit.end]))
  const firstWord = foldText(rest.split(' ')[0] ?? '')
  if (letterCount(rest) < 3 || STOP_START.has(firstWord)) return text
  // Another keyword left alone ("Weingut Kellerei") is not a name either.
  if (keywordFree(rest).length === 0) return text
  return rest
}

type WineryOption = { value: string; raw: string; conf: number; used: Box[]; score: number }

/** Only grape names: "WEINGUT" over "RIESLING" names no producer. */
function grapeOnlyText(line: Line): boolean {
  let rest = line.f.folded
  for (const hit of findTerms(rest, GRAPE_ALIASES)) rest = mask(rest, hit.start, hit.end)
  return rest !== line.f.folded && !/\p{L}{3,}/u.test(rest.replace(/\u0001/g, ' '))
}

/**
 * A taste line of two words or more is never a name or producer. A single taste word may well be
 * the name ("VIVACE"): it is only offered as description too, and the descriptor rules decide.
 */
const isTasteLine = (l: Line) => !!l.taste && l.words >= 2

const usableNeighbour = (l: Line | undefined): l is Line =>
  !!l && !isTasteLine(l) && !l.legal && !l.prose && !l.address && l.conf >= NAME_CONFIDENCE && letterCount(l.text) >= 3 && !grapeOnlyText(l)

/** Lines with a winery keyword: "Weingut Dr. Loosen", "Château Margaux", "WEINBIET" + "MANUFAKTUR". */
function keywordOptions(all: Line[], layout: Line[]): WineryOption[] {
  const out: WineryOption[] = []
  for (const line of all) {
    if (line.legal || line.prose || line.address) continue
    const hits = findTerms(line.f.folded, WINERY)
    if (hits.length === 0) continue
    const keyword: WineryKeyword = hits[0].value
    const parts = [line]
    if (keywordFree(line.text).length < 2) {
      // Keyword on its own line: the name sits below ("WEINGUT" / "KELLER") or above ("WEINBIET" / "MANUFAKTUR").
      const at = layout.find((l) => sameSpot(l.box, line.box))
      if (!at) continue
      const below = layout[at.order + 1]
      const above = layout[at.order - 1]
      const [first, second] = keyword.position === 'prefix' ? [below, above] : [above, below]
      // Only a line right next to the keyword belongs to it.
      const close = (l: Line | undefined): l is Line =>
        usableNeighbour(l) && Math.max(l.box.y0 - at.box.y1, at.box.y0 - l.box.y1) <= Math.max(l.h, at.h)
      const neighbour = close(first) ? first : close(second) ? second : undefined
      if (!neighbour) continue
      if (neighbour.order > at.order) parts.push(neighbour)
      else {
        parts.unshift(neighbour)
        // A one-word line between brand and keyword: "Gallo" / "FAMILY" / "VINEYARDS".
        const brand = layout[neighbour.order - 1]
        if (neighbour.words === 1 && usableNeighbour(brand) && brand.h >= neighbour.h && overlapsX(brand.box, neighbour.box)) parts.unshift(brand)
      }
    }
    // "CANTINA VIGNAIOLI DEL" / "MORELLINO DI SCANSANO": a name ending in "del" goes on.
    const last = parts[parts.length - 1]
    const lastAt = layout.find((l) => sameSpot(l.box, last.box))
    const next = lastAt ? layout[lastAt.order + 1] : undefined
    if (ENDS_WITH_LINK.test(last.f.folded) && usableNeighbour(next) && next.box.y0 - last.box.y1 <= Math.max(next.h, last.h)) parts.push(next)
    const raw = cutAtAddress(parts.map((p) => displayCase(p.text)).join(' '))
    if (letterCount(raw) < 3) continue
    out.push({
      value: stripKeyword(raw),
      raw,
      conf: Math.min(...parts.map((p) => p.conf)),
      used: parts.map((p) => p.box),
      score: Math.max(...parts.map(lineScore)),
    })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** "Erzeugerabfüllung Weingut Müller, D-67146 Deidesheim" → "Müller". */
function bottlerOptions(all: Line[]): WineryOption[] {
  const out: WineryOption[] = []
  for (const line of all) {
    if (!line.legal) continue
    const hit = findTerms(line.f.folded, BOTTLERS)[0]
    if (!hit) continue
    const raw = cutAtAddress(displayCase(line.text.slice(line.f.map[hit.end])))
    if (letterCount(raw) < 3 || raw.split(' ').length > 6) continue
    out.push({ value: stripKeyword(raw), raw, conf: line.conf, used: [line.box], score: lineScore(line) })
  }
  return out.sort((a, b) => b.score - a.score)
}

/** Confidence a reading needs before a winery list hit may be filled in. */
const WINERY_SURE_CONFIDENCE = 80

type WineryResult = {
  sure?: { value: string; used: Box[] }
  options: WineryOption[]
  /** List hits that are not sure; those of keyword lines first */
  listHits: string[]
  keywordHits: number
  /** Lines with a winery keyword or bottler note, also unreadable ones: never the name */
  keywordBoxes: Box[]
}

/**
 * Asks the winery list about keyword lines and about the most prominent plausible lines (alone
 * and with their neighbours: "Gallo" / "FAMILY" / "VINEYARDS"). Only a strong hit is sure.
 */
function findWinery(
  all: Line[],
  layout: Line[],
  excluded: (l: Line) => boolean,
  vocab: Set<string>,
  isReference: (text: string) => boolean,
  matchWinery?: ParseLabelOptions['matchWinery'],
): WineryResult {
  const found = [...keywordOptions(all, layout), ...bottlerOptions(all)]
  // The keyword vouches for its neighbour: "WEINGUT" (91) / "SCHMITTS KINDER" (69).
  const options = found.filter((o) => (o.used.length > 1 ? plausible(o.value, o.conf, vocab, 60, 60) : plausible(o.value, o.conf, vocab)))
  const keywordBoxes = [
    ...found.flatMap((o) => o.used),
    ...all.filter((l) => !l.legal && !l.prose && findTerms(l.f.folded, WINERY).length > 0).map((l) => l.box),
  ]
  const listHits: string[] = []
  if (!matchWinery) return { options, listHits, keywordHits: 0, keywordBoxes }

  // Keyword lines go to the list even when shaky: the list hit is a real name ("CONTE pi CAMPIANO").
  type Query = { text: string; conf: number; used: Box[]; keyword: boolean; headline?: boolean }
  const queries: Query[] = found.flatMap((o) => [
    { text: o.raw, conf: o.conf, used: o.used, keyword: true },
    ...(o.value !== o.raw ? [{ text: o.value, conf: o.conf, used: o.used, keyword: true }] : []),
  ])
  const eligible = layout.filter(
    (l) => !l.legal && !l.prose && !l.address && l.conf >= NAME_CONFIDENCE && !excluded(l) && !isDescriptorLine(l) && plausible(l.text, l.conf, vocab),
  )
  // The most prominent lines only: a noisy photo can have hundreds of readings.
  const top = new Set([...eligible].sort((a, b) => lineScore(b) - lineScore(a)).slice(0, 8))
  const inOrder = eligible.filter((l) => top.has(l))
  const byScore = [...top]
  // A one-word brand from the list ("CINZANO") counts only as the clearly read, biggest headline.
  for (const [i, l] of byScore.entries()) queries.push({ text: l.text, conf: l.conf, used: [l.box], keyword: false, headline: i === 0 && l.conf >= 90 })
  for (let i = 0; i < inOrder.length; i++) {
    const run = [inOrder[i]]
    for (let k = i + 1; k < inOrder.length && run.length < 3 && inOrder[k].order === run[run.length - 1].order + 1; k++) {
      run.push(inOrder[k])
      queries.push({ text: run.map((r) => r.text).join(' '), conf: Math.min(...run.map((r) => r.conf)), used: run.map((r) => r.box), keyword: false })
    }
  }

  let sure: WineryResult['sure']
  let sureLetters = 0
  let keywordHits = 0
  for (const q of queries) {
    const hit = matchWinery(q.text)
    if (!hit) continue
    // An appellation, region or grape that happens to be in the list ("Bordeaux") is not the producer.
    const strength = q.conf >= WINERY_SURE_CONFIDENCE && !isReference(q.text) ? wineryMatchStrength(hit, q.text) : 'none'
    if (strength === 'full' || (strength === 'single' && q.headline)) {
      const letters = letterCount(q.text)
      if (letters > sureLetters) {
        sure = { value: hit, used: q.used }
        sureLetters = letters
      }
    } else if ((q.keyword || plausible(q.text, q.conf, vocab)) && coversRead(hit, q.text)) {
      // Canonical spellings of keyword lines first ("CONTE pi CAMPIANO" → "Conte di Campiano").
      if (q.keyword) listHits.splice(keywordHits++, 0, hit)
      else listHits.push(hit)
    }
  }
  return { sure, options, listHits, keywordHits, keywordBoxes }
}

/** Every word of the reading (3+ letters) appears in the listed name: "PERE & FILS" in "Bonot Père & Fils". */
function coversRead(listed: string, read: string): boolean {
  const entry = foldedWords(listed)
  const ws = foldedWords(read).filter((w) => w.length >= 3)
  return ws.length > 0 && ws.every((w) => entry.some((e) => e === w || (w.length >= 6 && editDistance(w, e, 1) <= 1)))
}

// --- name ------------------------------------------------------------------------------------

// Sweetness and colour words count as description; sparkling appellations ("Prosecco", "Cava") can be the name.
const DESCRIPTOR_TERMS = [
  ...SWEETNESS_TERMS.map((t) => t.term),
  ...WINE_TYPE_TERMS.filter((t) => t.value !== 'sparkling' || t.term.startsWith('*') || t.term === 'sparkling').map((t) => t.term),
  'wine', 'wein', 'vin', 'vino', 'vinho',
].filter((t) => !t.includes(' '))
const DESCRIPTOR_WORDS = new Set(DESCRIPTOR_TERMS.filter((t) => !t.startsWith('*')))
const DESCRIPTOR_ENDINGS = DESCRIPTOR_TERMS.filter((t) => t.startsWith('*')).map((t) => t.slice(1))

function isDescriptorWord(word: string): boolean {
  if (DESCRIPTOR_WORDS.has(word) || DESCRIPTOR_ENDINGS.some((e) => word.endsWith(e))) return true
  return DESCRIPTOR_STEMS.some((stem) => word.startsWith(stem))
}

// Barrel notes: "Élevé en fûts de chêne", "im Barrique gereift", "aged in oak".
const AGEING_NOTE = /(?<![\p{L}])(futs?|chene|barriques?|oak|holzfass|barrel|legno|roble|botti)(?![\p{L}])/u

/** "süß & fruchtig", "Rotwein trocken", "Élevé en fûts de chêne": descriptions, not names. */
function isDescriptorLine(line: Line): boolean {
  if (isTasteLine(line) || AGEING_NOTE.test(line.loose)) return true
  const words = line.loose.split(' ').filter((w) => w && !CONNECTORS.has(w) && /\p{L}/u.test(w))
  if (words.length === 0) return true
  return words.filter(isDescriptorWord).length / words.length > 0.5
}

const CONJUNCTIONS = new Set(['&', 'und', 'mit', 'and', 'et', 'e', 'y'])
const LINK_WORDS = new Set(['&', 'und', 'mit', 'and', 'et', 'e', 'y', 'di', 'de', 'del', 'della', 'du', 'des', 'von', "d'"])

type GrapeIndex = Map<Line, GrapeHit[]>

/**
 * Display text of a line for the name: Title Case, misread grape names in dictionary spelling
 * ("NTEPULCIANO" → "Montepulciano"), without vintage and appellation tokens.
 */
function nameText(line: Line, continued = false, grapes?: GrapeIndex): string {
  let text = displayCase(line.text, continued)
  const fixes = (grapes?.get(line) ?? []).filter((h) => h.fuzzy).sort((a, b) => b.start - a.start)
  for (const fix of fixes) text = text.slice(0, line.f.map[fix.start]) + fix.alias + text.slice(line.f.map[fix.end])
  for (const t of [...yearTokens(text)].reverse()) text = text.slice(0, t.start) + text.slice(t.end)
  return trimJunk(text.replace(APPELLATION_TOKENS, '$1'))
}

// "Casa fondata nel 1757", "Seit 1856", "Since 1902".
const FOUNDED = new RegExp(String.raw`(?<![\p{L}])(${FOUNDING_WORDS})(?![\p{L}])[^\d]{0,20}(1[5-9]|20)\d\d`, 'u')

/** "WÜRTTEMBERG", "Rheinhessen · Deutschland", "SEIT": origin or filler, never the name. */
function isOriginOrFiller(line: Line): boolean {
  if (FOUNDED.test(line.loose)) return true
  const words = line.loose.replace(/\d+/g, ' ').trim()
  if (NOT_A_NAME.has(words)) return true
  const parts = words.split(/\s+/).filter((w) => w && !CONNECTORS.has(w))
  if (parts.length === 0) return false
  if (REGIONS.has(parts.join(' '))) return true
  return parts.every((w) => REGIONS.has(w) || NOT_A_NAME.has(w))
}

/** A name never starts or ends with a joining word ("Trollinger mit" → "Trollinger"). */
function trimLinks(text: string): string {
  const words = text.split(' ')
  while (words.length > 1 && LINK_WORDS.has(foldText(words[words.length - 1]))) words.pop()
  // Particles may start a name ("Della Luna", "Von Winning"), conjunctions may not.
  while (words.length > 1 && CONJUNCTIONS.has(foldText(words[0]))) words.shift()
  return words.join(' ')
}

const ENDS_WITH_LINK = /(?<![\p{L}])(&|und|mit|and|et|e|y|di|de|del|della|du|des|von|d')$/u
const STARTS_WITH_LINK = /^(&|und|mit|and|et|e|y|di|de|del|della|du|des|von|d'|dell'|l')(?![\p{L}])|^d'/u

/** Only grapes and joining words: "Trollinger mit Lemberger". */
function isGrapeOnly(line: Line, grapes: GrapeIndex): boolean {
  if (!grapes.has(line)) return false
  let rest = line.f.folded
  for (const hit of grapes.get(line) ?? []) rest = mask(rest, hit.start, hit.end)
  return rest
    .split(/[\s,/+\u0001]+/)
    .filter(Boolean)
    .every((w) => CONNECTORS.has(w) || !/\p{L}/u.test(w))
}

function shouldMerge(a: Line, b: Line, grapes: GrapeIndex): boolean {
  const maxH = Math.max(a.h, b.h)
  const ratio = Math.min(a.h, b.h) / maxH
  const gap = b.box.y0 - a.box.y1
  const centreA = (a.box.x0 + a.box.x1) / 2
  const centreB = (b.box.x0 + b.box.x1) / 2
  const widest = Math.max(a.box.x1 - a.box.x0, b.box.x1 - b.box.x0)
  const aligned = Math.min(a.box.x1, b.box.x1) > Math.max(a.box.x0, b.box.x0) || Math.abs(centreA - centreB) < widest / 2
  if (!aligned || gap < -0.5 * maxH) return false
  // A similar-sized list of grapes right under the name belongs to it: "Lust & Laune" / "Trollinger mit
  // Lemberger". Clearly smaller grapes under a big brand are a separate line ("Villa Ilona" / "Grüner Veltliner").
  if (isGrapeOnly(b, grapes) && ratio >= 0.75 && gap <= 1.5 * maxH) return true
  if (gap > maxH) return false
  if (ENDS_WITH_LINK.test(a.f.folded) || STARTS_WITH_LINK.test(b.f.folded)) return ratio >= 0.5
  return ratio >= 0.8
}

/** Weight of a reading: confident lines count fully, shaky ones (often texture noise) much less. */
const confidenceWeight = (conf: number) => Math.min(1, Math.max(0.2, (conf - 30) / 55))

/** How prominent a line is: its height, weighted by confidence. */
function lineScore(l: Line): number {
  return l.h * confidenceWeight(l.conf)
}

type Group = { lines: Line[]; score: number; conf: number; text: string }

const groupText = (lines: Line[], grapes: GrapeIndex) =>
  trimLinks(trimJunk(lines.map((line, i) => nameText(line, i > 0, grapes)).join(' ')))

// Quality and style words that often follow a grape name ("Bacchus Kabinett", "Tempranillo Crianza").
const QUALITY_WORDS = new Set([
  'kabinett', 'spatlese', 'auslese', 'classic', 'selection', 'reserva', 'gran', 'crianza', 'riserva', 'classico',
  'superiore', 'reserve', 'grand', 'cru', 'premier', 'vieilles', 'vignes', 'alte', 'reben',
])

/** Only grapes plus quality or taste words: "GRÜNER VELTLINER", "Riesling Kabinett". */
function isGrapeGroup(g: Group, grapes: GrapeIndex): boolean {
  return g.lines.every((line) => {
    if (!grapes.has(line)) return false
    let rest = line.f.folded
    for (const hit of grapes.get(line) ?? []) rest = mask(rest, hit.start, hit.end)
    return rest
      .split(/[^\p{L}]+/u)
      .filter(Boolean)
      .every((w) => CONNECTORS.has(w) || QUALITY_WORDS.has(w) || isDescriptorWord(w))
  })
}

/** Only quality words: "Crianza", "Riserva" – part of a name, never a competing one. */
const isQualityOnly = (text: string) => foldedWords(text).every((w) => QUALITY_WORDS.has(w) || /^\d+$/.test(w))

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const cut = text.slice(0, max + 1)
  const space = cut.lastIndexOf(' ')
  return trimJunk(space > 0 ? cut.slice(0, space) : text.slice(0, max))
}

function nameGroups(layout: Line[], excluded: (l: Line) => boolean, grapes: GrapeIndex, vocab: Set<string>): Group[] {
  const isCandidate = (l: Line) =>
    l.conf >= NAME_CONFIDENCE &&
    // Debris never joins a group: "GRÜNER VELTLINER" + "Frochen" (55 %).
    plausible(nameText(l, false, grapes), l.conf, vocab, 60, 60) &&
    !l.legal &&
    !l.prose &&
    !l.address &&
    !excluded(l) &&
    !isDescriptorLine(l) &&
    !isOriginOrFiller(l) &&
    letterCount(nameText(l, false, grapes)) >= 3
  const groups: Group[] = []
  let current: Group | undefined
  for (const line of layout) {
    if (!isCandidate(line)) {
      current = undefined
      continue
    }
    const last = current?.lines[current.lines.length - 1]
    if (current && last && current.lines.length < 3 && shouldMerge(last, line, grapes)) {
      current.lines.push(line)
      current.score = Math.max(current.score, lineScore(line))
      current.conf = Math.min(current.conf, line.conf)
    } else {
      current = { lines: [line], score: lineScore(line), conf: line.conf, text: '' }
      groups.push(current)
    }
  }
  for (const g of groups) g.text = groupText(g.lines, grapes)
  return groups.filter((g) => letterCount(g.text) >= 3).sort((a, b) => b.score - a.score || b.conf - a.conf)
}

// Checked on every reading, even shaky ones: it only decides which headline is the domaine.
const DOMAINE_BOTTLED = /mise? [ei]n b[o0]u|bouteille (au|a la)|au domaine|a la propriete/
// Words that headline a label without being a producer.
const NOT_A_WINERY = /^(the original|original|since|edition|limited|selection|reserve|reserva|riserva|cuvee|classic|premium)$/

/** Confidence a name line needs to be filled in from a reference list. */
const NAME_SURE_CONFIDENCE = 75
/** Share of a line an appellation must cover to count as "only the appellation" (winery check). */
const APPELLATION_COVERAGE = 0.75

// Where the appellation is not the wine's name: in Germany and Austria it is the growing region,
// in Spain and Portugal the brand and the ageing ("El Coto Crianza", Rioja) name the wine.
const ORIGIN_COUNTRIES = new Set(['DE', 'AT', 'ES', 'PT'])

// Boilerplate around an appellation in the small print ("Appellation Bordeaux Contrôlée").
const APPELLATION_BOILERPLATE = new Set([
  'appellation', 'controlee', 'protegee', 'origine', 'denominazione', 'controllata', 'garantita', 'protetta',
  'denominacion', 'origen', 'calificada', 'protegida', 'indicazione', 'geografica', 'tipica', 'vin', 'vino', 'wine',
  'product', 'produit', 'prodotto', 'france', 'italia', 'italy', 'espana', 'di', 'de', 'd', 'e', 'del', 'la', 'of',
])

type NameOption = { value: string; score: number; lines: Line[] }

function appellationName(text: string, m: AppellationMatch): string {
  // Companion words keep their place: "Rosso" + "Maremma Toscana", "Chianti Classico" + "Riserva".
  const ws = text.split(/\s+/).filter((w) => letterCount(w) > 0)
  const folded = foldedWords(text)
  if (ws.length !== folded.length) return m.ref.name
  const before = ws.slice(0, m.start).map((w) => displayCase(w)).join(' ')
  const after = ws.slice(m.end).map((w) => displayCase(w)).join(' ')
  return trimJunk([before, m.ref.name, after].filter(Boolean).join(' '))
}

const nameAppellation = (a: AppellationRef) => !ORIGIN_COUNTRIES.has(a.country.toUpperCase()) && !REGIONS.has(foldText(a.name))

/** "Montepulciano d'Abruzzo" without the appellation list: a grape, "di"/"d'" and a place. */
const GRAPE_OF_PLACE = /^[\p{L}' ]+ (di|d'|del|della|dei|delle) ?\p{L}{4,}$/u

/**
 * The name, when a reference list vouches for it: a vineyard ("Wehlener Sonnenuhr") or an
 * appellation that makes up the whole headline ("Montepulciano d'Abruzzo", "Bordeaux").
 */
function referenceName(g: Group, grapes: GrapeIndex, options: ParseLabelOptions, layout: Line[]): NameOption | undefined {
  if (g.conf < NAME_SURE_CONFIDENCE) return undefined
  // The end of a longer name: "Cantina Vignaioli del" / "Morellino di Scansano".
  const before = layout[g.lines[0].order - 1]
  if (before && ENDS_WITH_LINK.test(before.f.folded) && before.box.y1 + before.h >= g.lines[0].box.y0) return undefined
  const site = options.sites ? findSite(g.text, options.sites) : null
  if (site) return { value: site.value, score: g.score, lines: g.lines }
  const list = options.appellations ?? []
  if (list.length > 0) {
    const m = findAppellations(g.text, list).find((a) => a.extra === 0 && nameAppellation(a.ref))
    if (m) return { value: appellationName(g.text, m), score: g.score, lines: g.lines }
    return undefined
  }
  // Without the list: a grape name followed by its place, as in many Italian DOCs.
  const first = g.lines[0]
  const startsWithGrape = (grapes.get(first) ?? []).some((h) => h.start === 0)
  if (startsWithGrape && GRAPE_OF_PLACE.test(g.text)) return { value: g.text, score: g.score, lines: g.lines }
  return undefined
}

/** Appellations in the small print ("Primitivo di Manduria Denominazione di Origine Controllata"). */
function smallPrintAppellations(lines: Line[], list: readonly AppellationRef[]): NameOption[] {
  if (list.length === 0) return []
  const out: NameOption[] = []
  for (const line of lines) {
    if (!line.legal || line.address || line.conf < NAME_SURE_CONFIDENCE) continue
    const ws = foldedWords(line.text)
    const onlyBoilerplate = (m: AppellationMatch) =>
      ws.every((w, i) => (i >= m.start && i < m.end) || APPELLATION_BOILERPLATE.has(w) || /^\d+$/.test(w)) ||
      m.extra === 0
    const m = findAppellations(line.text, list).find((a) => onlyBoilerplate(a) && nameAppellation(a.ref))
    if (m) out.push({ value: m.ref.name, score: lineScore(line), lines: [line] })
  }
  return out
}

const placeCache = new WeakMap<readonly SiteRef[], Set<string>>()

/** Vineyard and village names: "FALKENSTEIN" on a label is a site, even if a winery has that name. */
function placeNames(sites: readonly SiteRef[]): Set<string> {
  let set = placeCache.get(sites)
  if (!set) {
    set = new Set(sites.flatMap((s) => [s.name, s.village ?? ''].map((n) => foldedWords(n).join(' ')).filter(Boolean)))
    placeCache.set(sites, set)
  }
  return set
}

const MAX_CANDIDATES = 3

/**
 * Taste lines for the free-text description, most prominent first. Only clearly read lines, one
 * per spot on the label, each text once. Never sure: the form only offers them.
 */
function findDescriptions(all: Line[]): string[] | undefined {
  const lines = all
    .filter((l) => l.taste && l.conf >= NAME_CONFIDENCE && !l.legal && !l.address && !l.prose)
    .sort((a, b) => lineScore(b) - lineScore(a))
  const out: string[] = []
  const seen = new Set<string>()
  const spots: Box[] = []
  for (const line of lines) {
    const text = truncate(line.taste!, MAX_DESCRIPTION)
    const key = squash(text)
    if (seen.has(key) || spots.some((b) => sameSpot(b, line.box))) continue
    seen.add(key)
    spots.push(line.box)
    out.push(text)
    if (out.length === MAX_CANDIDATES) break
  }
  return out.length > 0 ? out : undefined
}

/** Up to three distinct values, best first, without the filled-in one. */
function pickCandidates(values: string[], filled?: string): string[] | undefined {
  const seen = new Set(filled ? [squash(filled)] : [])
  const out: string[] = []
  for (const raw of values) {
    const value = truncate(trimJunk(raw), MAX_NAME)
    const key = squash(value)
    // Names start with a capital; "tradition des vins de …" is running text.
    if (key.length < 3 || seen.has(key) || /^\p{Ll}/u.test(value)) continue
    seen.add(key)
    out.push(value)
    if (out.length === MAX_CANDIDATES) break
  }
  return out.length > 0 ? out : undefined
}

// --- entry -----------------------------------------------------------------------------------

export function parseLabel(lines: OcrLine[], options: ParseLabelOptions = {}): LabelSuggestion {
  const currentYear = options.currentYear ?? new Date().getFullYear()
  const all = lines
    .map(toLine)
    .filter((l): l is Line => l !== null)
    .sort(readingOrder)
  const layout = layoutLines(all)
  const vocab = vocabulary(options)

  const suggestion: LabelSuggestion = {}

  const vintage = findVintage(all, layout, currentYear)
  if (vintage) suggestion.vintage = vintage

  const alcohol = findAlcohol(lines)
  if (alcohol) suggestion.alcohol = alcohol

  const sweetness = findSweetness(all)
  if (sweetness) suggestion.sweetness = sweetness

  // A grape inside a producer's name is no grape: "Cantina Vignaioli del Morellino di Scansano".
  const producerBoxes = keywordOptions(all, layout).flatMap((o) => o.used)
  const grapeHits = findGrapeHits(all, layout).filter((h) => !producerBoxes.some((b) => sameSpot(b, h.line.box)))
  const grapes: GrapeIndex = new Map()
  for (const hit of grapeHits) grapes.set(hit.line, [...(grapes.get(hit.line) ?? []), hit])
  const printedGrapes = joinSplitGrapes(grapeHits, layout)
  const grapeVariety = findGrapes(printedGrapes)
  if (grapeVariety) suggestion.grapeVariety = grapeVariety

  // --- winery: a strong list hit is filled in, keyword lines are offered
  const inBoxes = (boxes: Box[]) => (l: Line) => boxes.some((b) => sameSpot(b, l.box))
  const grapeOnly = (l: Line) => isGrapeOnly(l, grapes)
  const places = placeNames(options.sites ?? [])
  const isReference = (text: string) => {
    const ws = foldedWords(text)
    if (places.has(ws.join(' '))) return true
    if (ws.length === 0 || REGIONS.has(ws.join(' ')) || ws.every((w) => REGIONS.has(w) || QUALITY_WORDS.has(w))) return true
    if (findAppellations(text, options.appellations ?? []).some((m) => m.coverage >= APPELLATION_COVERAGE)) return true
    const f = foldText(text)
    let rest = f
    for (const h of findTerms(f, GRAPE_ALIASES)) rest = mask(rest, h.start, h.end)
    return !/\p{L}{3,}/u.test(rest.replace(/\u0001/g, ' '))
  }
  const winery = findWinery(all, layout, grapeOnly, vocab, isReference, options.matchWinery)
  const wineryBoxes = [...(winery.sure?.used ?? []), ...winery.keywordBoxes]

  // --- name: groups of headline lines, without the producer's lines
  let groups = nameGroups(layout, inBoxes(wineryBoxes), grapes, vocab)
  // A line of a well-read group may be a little shakier: "LUST &" (76) / "LAUNE" (70).
  const plausibleGroup = (g: Group) => {
    const strong = g.lines.length > 1 && g.lines.some((l) => l.conf >= SURE_CONFIDENCE)
    return g.lines.every((l, i) => (strong ? plausible(nameText(l, i > 0, grapes), l.conf, vocab, 60, 60) : plausible(nameText(l, i > 0, grapes), l.conf, vocab)))
  }

  // Producer guesses without keyword (suggestions only), and their lines are not the name.
  const wineryGuesses: string[] = []
  const domaineBottled = lines.some((l) => DOMAINE_BOTTLED.test(foldText(l.text).replace(/[^\p{L}\p{N}]+/gu, ' ')))
  const top = groups.filter(plausibleGroup)
  if (!winery.sure && winery.keywordBoxes.length === 0 && winery.listHits.length === 0 && top.length >= 2) {
    const grapeGroup = top.slice(1).find((g) => isGrapeGroup(g, grapes) && g.score >= 0.5 * top[0].score)
    let producer: Group | undefined
    if (domaineBottled) {
      // "Mis en bouteille au domaine": the biggest line is the domaine, the next one the cuvée.
      producer = top[0]
    } else if (grapeGroup && !top[0].lines.some((l) => grapes.has(l))) {
      // A big brand over a grape line ("Villa Ilona" / "GRÜNER VELTLINER"): the brand is the producer.
      producer = top[0]
    }
    if (producer) {
      wineryGuesses.push(producer.text)
      groups = groups.filter((g) => g !== producer)
    } else {
      // A short second headline is often the producer ("DELLA LUNA"); it stays a name candidate too.
      const second = top.slice(1).find(
        (g) =>
          g.score >= 0.3 * top[0].score &&
          g.text.split(' ').length <= 4 &&
          !/\d|,/.test(g.text) &&
          !g.lines.some((l) => grapes.has(l)) &&
          !isQualityOnly(g.text) &&
          !NOT_A_WINERY.test(foldText(g.text)),
      )
      if (second) wineryGuesses.push(second.text)
    }
  }

  // --- wine type and grape from the criteria (see "criteria" above)
  const inProducer = inBoxes([...wineryBoxes, ...producerBoxes])
  const origins = findOrigins(all, layout, groups, options.appellations ?? [], inProducer)
  const wineType = findWineType({ lines: all, printedGrapes, origins })
  if (wineType) suggestion.wineType = wineType
  const grapeColour = grapeColourOnLabel(all, wineType)
  if (suggestion.grapeVariety) {
    suggestion.grapeVariety = confirmPrintedGrape(suggestion.grapeVariety, printedGrapes, origins, wineType, grapeColour)
  } else if (printedGrapes.length === 0) {
    Object.assign(suggestion, grapesFromOrigin(origins, wineType, grapeColour))
  }

  // A name from the reference lists is filled in only when no other headline competes with it.
  const references = [
    ...groups.flatMap((g) => referenceName(g, grapes, options, layout) ?? []),
    ...smallPrintAppellations(all, options.appellations ?? []),
  ].sort((a, b) => b.score - a.score)
  const best = references[0]
  let name: string | undefined
  if (best) {
    const competing = groups.some(
      (g) =>
        !g.lines.some((l) => best.lines.includes(l)) &&
        g.conf >= SURE_CONFIDENCE &&
        g.score > 0.8 * best.score &&
        plausibleGroup(g) &&
        !isGrapeGroup(g, grapes) &&
        !isQualityOnly(g.text) &&
        !references.some((r) => r.lines.some((l) => g.lines.includes(l))),
    )
    if (!competing) name = truncate(best.value, MAX_NAME)
  }
  if (name) suggestion.name = { value: name, sure: true }

  const nameOptions = [
    ...references.filter((r) => r !== best || !name).map((r) => ({ value: r.value, score: r.score })),
    ...groups
      .filter((g) => plausibleGroup(g) && !(name && best?.lines.some((l) => g.lines.includes(l))))
      .map((g) => ({ value: references.find((r) => r.lines.every((l) => g.lines.includes(l)))?.value ?? g.text, score: g.score })),
  ].sort((a, b) => b.score - a.score)
  const nameCandidates = pickCandidates(nameOptions.map((o) => o.value), name)
  if (nameCandidates) suggestion.nameCandidates = nameCandidates

  if (winery.sure) suggestion.winery = { value: truncate(winery.sure.value, MAX_WINERY), sure: true }
  const wineryCandidates = pickCandidates(
    [
      ...winery.listHits.slice(0, winery.keywordHits),
      ...winery.options.map((o) => o.value),
      ...winery.listHits.slice(winery.keywordHits),
      ...wineryGuesses,
    ].map((v) => truncate(v, MAX_WINERY)),
    winery.sure?.value,
  )
  if (wineryCandidates) {
    suggestion.wineryCandidates = wineryCandidates
    // Which of them the winery list knows: the form tells the host so
    const listed = new Set(winery.listHits.map((v) => squash(truncate(trimJunk(truncate(v, MAX_WINERY)), MAX_NAME))))
    const listedWineries = wineryCandidates.filter((c) => listed.has(squash(c)))
    if (listedWineries.length > 0) suggestion.listedWineries = listedWineries
  }

  const descriptionCandidates = findDescriptions(all)
  if (descriptionCandidates) suggestion.descriptionCandidates = descriptionCandidates
  return suggestion
}
