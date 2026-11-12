// Taste lines on a label ("SÜSS & FRUCHTIG", "Fruttato e morbido"): offered for the wine's free-text
// description, never as name or winery. Pure and browser-safe.

import { CONNECTORS, GERMAN_TASTE_WORDS, SWEETNESS_TERMS, TASTE_FILLERS, TASTE_WORDS } from './dictionaries'
import { editDistance } from './match-reference'
import { foldText } from './normalize'

/** Folded taste word → its spelling in a description; the first listed wins ("elegant" before "élégant"). */
const TASTE = new Map<string, string>()
for (const word of TASTE_WORDS) if (!TASTE.has(foldText(word))) TASTE.set(foldText(word), word)
const TASTE_KEYS = [...TASTE.keys()]
const GERMAN = new Set(GERMAN_TASTE_WORDS.map(foldText))
/** Single-word sweetness terms: allowed in a taste line, but not enough on their own ("trocken"). */
const SWEETNESS = new Set(SWEETNESS_TERMS.map((t) => t.term).filter((t) => !t.includes(' ')))
const SWEETNESS_SPELLING: Record<string, string> = { suss: 'süß', susse: 'süße', suess: 'süß' }

const GERMAN_ENDINGS = ['e', 'er', 'es', 'em', 'en']
const ROMANCE_ENDINGS = ['a', 'i', 'e', 'os', 'as']
/** French feminine and plural of words in -é: "fruitée", "veloutés". */
const FRENCH_ENDINGS = ['e', 's', 'es']
/** Running text is no description: "Fruchtig, mit Noten von Kirsche" is not one either. */
const MAX_WORDS = 6
/** Misread words ("FRUCHTIC") are only matched from this length on – "Fritsch" is a winery, not "frisch". */
const FUZZY_MIN = 7

/** `misread`: matched only within one edit; a line needs one word read as printed besides it. */
type Word = { kind: 'taste' | 'sweetness' | 'other'; text: string; misread?: boolean }

/** Spelling of a taste word, also inflected ("würziger", "fresca") or misread by one letter. */
function tasteWord(folded: string): { text: string; misread?: boolean } | null {
  const exact = TASTE.get(folded)
  if (exact) return { text: exact }
  for (const [key, word] of TASTE) {
    if (!folded.startsWith(key)) continue
    const ending = folded.slice(key.length)
    if (GERMAN.has(key) ? GERMAN_ENDINGS.includes(ending) : key.endsWith('e') && FRENCH_ENDINGS.includes(ending)) {
      return { text: word + ending }
    }
  }
  for (const [key, word] of TASTE) {
    if (!key.endsWith('o') || !folded.startsWith(key.slice(0, -1))) continue
    const ending = folded.slice(key.length - 1)
    if (ROMANCE_ENDINGS.includes(ending)) return { text: word.slice(0, -1) + ending }
  }
  if (folded.length >= FUZZY_MIN) {
    const near = TASTE_KEYS.filter((key) => key.length >= FUZZY_MIN && editDistance(folded, key, 1) <= 1)
    if (near.length === 1) return { text: TASTE.get(near[0])!, misread: true }
  }
  return null
}

function readWord(core: string): Word | null {
  const folded = foldText(core)
  if (CONNECTORS.has(folded) || TASTE_FILLERS.has(folded)) return { kind: 'other', text: core.toLocaleLowerCase() }
  if (SWEETNESS.has(folded)) return { kind: 'sweetness', text: SWEETNESS_SPELLING[folded] ?? core.toLocaleLowerCase() }
  const taste = tasteWord(folded)
  return taste ? { kind: 'taste', ...taste } : null
}

/**
 * The line as a taste description in sentence case ("SÜSS & FRUCHTIG" → "Süß & fruchtig"), or null
 * when it is something else. Every word must be a taste word, a sweetness term or a joining word,
 * and at least one must be a taste word: "trocken" alone is the sweetness level, not a description.
 * A misread word counts only next to one read as printed ("SUSS & FRUCHTIC").
 */
export function tasteDescription(text: string): string | null {
  const tokens = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  if (tokens.length === 0) return null
  let words = 0
  let tastes = 0
  let asPrinted = 0
  const out: string[] = []
  for (const token of tokens) {
    const [, lead, core, trail] = /^([^\p{L}&+/-]*)(.*?)([^\p{L}]*)$/u.exec(token) ?? ['', '', token, '']
    if (!core) {
      // "2019", "100%", "12.5": a vintage or an alcohol content, so running text, not a description
      if (/\p{N}/u.test(token)) return null
      out.push(token)
      continue
    }
    // "fruchtig-frisch": each part on its own
    const parts = core === '-' ? [core] : core.split('-')
    const read: string[] = []
    for (const part of parts) {
      const word = readWord(part)
      if (!word) return null
      words++
      if (word.kind === 'taste') tastes++
      if (word.kind !== 'other' && !word.misread) asPrinted++
      read.push(word.text)
    }
    out.push(lead + read.join('-') + trail)
  }
  if (tastes === 0 || asPrinted === 0 || words > MAX_WORDS) return null
  const joined = out.join(' ').replace(/[\s,;:·.!?\-–]+$/u, '').trim()
  const [first = '', ...rest] = Array.from(joined)
  return first.toLocaleUpperCase() + rest.join('')
}
