// Strict lookups in the reference lists (appellations, vineyard sites, wineries). Pure and
// browser-safe. Everything here errs on the side of "no match": a hit may fill a field.

import { foldText } from './normalize'
import type { Appellation, Site } from './reference-data'

export type AppellationRef = Appellation
export type SiteRef = Site

/** Folded words of a text: lowercase, no accents, split at everything that is not a letter or digit. */
export function words(text: string): string[] {
  return foldText(text).split(/[^\p{L}\p{N}]+/u).filter(Boolean)
}

const letterSum = (ws: string[]) => ws.reduce((s, w) => s + w.length, 0)

/** Bounded Levenshtein distance; returns max + 1 when the words are further apart. */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const row = [i]
    let best = i
    for (let j = 1; j <= b.length; j++) {
      row[j] = Math.min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
      best = Math.min(best, row[j])
    }
    if (best > max) return max + 1
    prev = row
  }
  return prev[b.length]
}

/** Same word, allowing one misread letter from 6 letters and two from 10. Short words must be exact. */
export function sameWord(read: string, known: string): boolean {
  if (read === known) return true
  const max = known.length >= 10 ? 2 : known.length >= 6 ? 1 : 0
  if (max === 0) return false
  return editDistance(read, known, max) <= max
}

// --- appellations --------------------------------------------------------------------------

type IndexedAppellation = { ref: AppellationRef; words: string[]; letters: number }
const appellationIndex = new WeakMap<readonly AppellationRef[], IndexedAppellation[]>()

function indexAppellations(list: readonly AppellationRef[]): IndexedAppellation[] {
  let index = appellationIndex.get(list)
  if (!index) {
    index = list
      .map((ref) => {
        const ws = words(ref.name)
        return { ref, words: ws, letters: letterSum(ws) }
      })
      // Two-letter names and fragments are too easy to read into noise.
      .filter((a) => a.words.length > 0 && a.letters >= 4)
      // Longest first, so "Barbera d'Asti" wins over "Asti".
      .sort((a, b) => b.letters - a.letters)
    appellationIndex.set(list, index)
  }
  return index
}

// Words that may stand next to an appellation on its line without making it a different name.
const APPELLATION_COMPANIONS = new Set([
  'doc', 'docg', 'igt', 'igp', 'aoc', 'aop', 'do', 'dop', 'doca', 'doq', 'pdo', 'pgi', 'dac', 'qba',
  'classico', 'superiore', 'riserva', 'reserva', 'gran', 'grand', 'cru', 'premier', '1er', 'villages',
  'rosso', 'bianco', 'rosato', 'rouge', 'blanc', 'rose', 'tinto', 'blanco', 'rosado', 'crianza',
])

export type AppellationMatch = {
  ref: AppellationRef
  /** Word positions in `words(text)` */
  start: number
  end: number
  /** True when every word matched exactly (after folding) */
  exact: boolean
  /** Share of the line's letters (without vintage and companion words) the appellation covers */
  coverage: number
  /** Words of the line outside the appellation that are not companion words ("El" in "El Corton") */
  extra: number
}

/** Appellations are matched more strictly than other words: one misread letter from 7 letters on. */
function sameAppellationWord(read: string, known: string): boolean {
  if (read === known) return true
  const max = known.length >= 10 ? 2 : known.length >= 7 ? 1 : 0
  return max > 0 && editDistance(read, known, max) <= max
}

/**
 * All appellations in a text, in reading order, without overlaps (longer names win). Words under
 * 7 letters must match exactly; longer words may have one misread letter, from 10 letters two.
 */
export function findAppellations(text: string, list: readonly AppellationRef[]): AppellationMatch[] {
  if (list.length === 0) return []
  const ws = words(text)
  if (ws.length === 0) return []
  const significant = ws.filter((w) => !APPELLATION_COMPANIONS.has(w) && !/^\d+$/.test(w))
  const lineLetters = Math.max(1, letterSum(significant))
  const taken = new Array<boolean>(ws.length).fill(false)
  const found: AppellationMatch[] = []
  for (const a of indexAppellations(list)) {
    const n = a.words.length
    for (let i = 0; i + n <= ws.length; i++) {
      if (taken[i]) continue
      let exact = true
      let ok = true
      for (let k = 0; k < n && ok; k++) {
        const read = ws[i + k]
        const known = a.words[k]
        if (taken[i + k]) ok = false
        else if (read !== known) {
          exact = false
          ok = sameAppellationWord(read, known)
        }
      }
      if (!ok) continue
      for (let k = i; k < i + n; k++) taken[k] = true
      const extra = ws.filter((w, k) => (k < i || k >= i + n) && !APPELLATION_COMPANIONS.has(w) && !/^\d+$/.test(w)).length
      found.push({ ref: a.ref, start: i, end: i + n, exact, coverage: Math.min(1, a.letters / lineLetters), extra })
    }
  }
  return found.sort((a, b) => a.start - b.start)
}

// --- vineyard sites --------------------------------------------------------------------------

type IndexedSite = { ref: SiteRef; words: string[]; villages: string[] }
const siteIndex = new WeakMap<readonly SiteRef[], IndexedSite[]>()

// Parts of village names that never form the adjective ("Bad Dürkheim" → "Dürkheimer").
const VILLAGE_FILLERS = new Set(['an', 'am', 'der', 'die', 'bad', 'im', 'in', 'ob', 'bei', 'sankt', 'st', 'und', 'a', 'd'])

function indexSites(list: readonly SiteRef[]): IndexedSite[] {
  let index = siteIndex.get(list)
  if (!index) {
    index = list
      .map((ref) => ({
        ref,
        words: words(ref.name),
        villages: ref.village ? words(ref.village).filter((w) => w.length >= 3 && !VILLAGE_FILLERS.has(w)) : [],
      }))
      .filter((s) => letterSum(s.words) >= 4)
    siteIndex.set(list, index)
  }
  return index
}

/** "Piesporter" belongs to Piesport, "Zeltinger" to Zeltingen, "Niederhäuser" to Niederhausen. */
function isVillageAdjective(word: string, village: string): boolean {
  if (!word.endsWith('er') || word.length < 6) return false
  const stem = word.slice(0, -2)
  return stem === village || village === `${stem}en` || village === `${stem}n` || (stem.length >= 6 && editDistance(stem, village, 1) <= 1)
}

// Words that introduce a single vineyard: Austria ("Ried"), South Tyrol and Italy ("Vigna"), Germany ("Lage").
const SITE_PREFIXES = new Set(['ried', 'riede', 'vigna', 'vigneto', 'lage'])

export type SiteMatch = { ref: SiteRef; value: string; start: number; end: number }

/**
 * A single vineyard in a text, but only in an unambiguous form: the village adjective in front
 * ("Wehlener Sonnenuhr") or a "Ried"/"Vigna" prefix. A bare site name is too common
 * ("Kirchberg", "Sonnenberg") to count.
 */
export function findSite(text: string, list: readonly SiteRef[]): SiteMatch | null {
  if (list.length === 0) return null
  const ws = words(text)
  const original = text.split(/[^\p{L}\p{N}'’]+/u).filter(Boolean)
  // Only use the original spelling when it lines up word by word with the folded words.
  const display = (i: number) => (original.length === ws.length ? original[i] : ws[i])
  let best: SiteMatch | null = null
  for (const site of indexSites(list)) {
    const n = site.words.length
    for (let i = 1; i + n <= ws.length; i++) {
      if (!site.words.every((w, k) => sameWord(ws[i + k], w))) continue
      const before = ws[i - 1]
      const prefixed = SITE_PREFIXES.has(before)
      const adjective = site.villages.some((v) => isVillageAdjective(before, v))
      if (!prefixed && !adjective) continue
      const head = display(i - 1)
      const value = `${head.charAt(0).toUpperCase()}${head.slice(1).toLowerCase()} ${site.ref.name}`
      if (!best || n > best.end - best.start - 1) best = { ref: site.ref, value, start: i - 1, end: i + n }
    }
  }
  return best
}

// --- wineries ----------------------------------------------------------------------------------

// Producer words a label may leave out ("Weingut Schmitts Kinder" is printed as "Schmitts Kinder").
const OPTIONAL_KEYWORDS = new Set([
  'weingut', 'weinhaus', 'weinbau', 'winzerhof', 'weinhof', 'domaine', 'chateau', 'bodega', 'bodegas', 'cantina',
  'tenuta', 'azienda', 'agricola', 'winery', 'estate', 'wines',
])
// Legal forms and joining words that never decide a match.
const IGNORABLE = new Set([
  'gmbh', 'kg', 'ohg', 'gbr', 'eg', 'ag', 'sa', 'sas', 'srl', 'spa', 'sl', 'slu', 'ltd', 'inc', 'llc', 'co',
  'und', 'and', 'et', 'e', 'y',
])
// Words that a winery list may contain as a name but that labels print for other reasons.
const GENERIC_NAMES = new Set([
  'tradition', 'traditional', 'reserve', 'reserva', 'riserva', 'selection', 'classic', 'premium', 'edition',
  'cuvee', 'original', 'family', 'vineyards', 'winery', 'estate', 'wines', 'wine', 'wein', 'vino', 'vin',
])

const significant = (ws: string[]) => ws.filter((w) => w.length >= 2 && !IGNORABLE.has(w))

export type WineryStrength = 'none' | 'single' | 'full'

/**
 * How safe a winery list hit is to fill in. `full`: every word of the listed name is on the label
 * (only a leading "Weingut"/"Domaine"/… may be missing, and only when two words remain), the
 * label adds no words of its own, and the name is long enough not to be a chance hit.
 * `single`: a one-word brand of 7+ letters read exactly ("CINZANO") – right only when it is
 * also the label's headline, which the caller has to check.
 */
export function wineryMatchStrength(listed: string, read: string): WineryStrength {
  const entry = significant(words(listed))
  const text = significant(words(read))
  if (entry.length === 0 || text.length === 0) return 'none'
  const core = entry.filter((w) => !OPTIONAL_KEYWORDS.has(w))
  if (core.length === 0 || letterSum(core) < 6) return 'none'
  // Every word of the listed name must be read, except optional keywords.
  const used = new Set<number>()
  for (const w of entry) {
    const at = text.findIndex((t, i) => !used.has(i) && sameWord(t, w))
    if (at >= 0) used.add(at)
    else if (!OPTIONAL_KEYWORDS.has(w)) return 'none'
  }
  // The label may not add words of its own, apart from keywords.
  if (text.some((t, i) => !used.has(i) && !OPTIONAL_KEYWORDS.has(t))) return 'none'
  const keywordRead = text.some((t, i) => used.has(i) && OPTIONAL_KEYWORDS.has(t))
  if (core.length === 1) {
    const [only] = core
    if (GENERIC_NAMES.has(only)) return 'none'
    if (keywordRead) return only.length >= 5 ? 'full' : 'none'
    return entry.length === 1 && only.length >= 7 && text.includes(only) ? 'single' : 'none'
  }
  return core.some((w) => !GENERIC_NAMES.has(w)) ? 'full' : 'none'
}

/** Whether a winery list hit may be filled in at all (see `wineryMatchStrength`). */
export const isStrongWineryMatch = (listed: string, read: string) => wineryMatchStrength(listed, read) !== 'none'
