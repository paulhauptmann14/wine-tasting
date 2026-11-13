// Text helpers for label parsing: folding for dictionary lookups, OCR clean-up and Title Case.

export type Folded = {
  /** Lowercase text without diacritics, ß → ss, æ → ae, œ → oe. */
  folded: string
  /** For each folded char the index of its source char; one extra entry for the end. */
  map: number[]
}

/** Folds text for comparisons and keeps a map back to the original positions. */
export function fold(text: string): Folded {
  let folded = ''
  const map: number[] = []
  for (let i = 0; i < text.length; i++) {
    const lower = text[i].toLowerCase()
    let f: string
    if (lower === 'ß' || text[i] === 'ẞ') f = 'ss'
    else if (lower === 'æ') f = 'ae'
    else if (lower === 'œ') f = 'oe'
    else f = lower.normalize('NFD').replace(/\p{M}/gu, '')
    for (let j = 0; j < f.length; j++) {
      folded += f[j]
      map.push(i)
    }
  }
  map.push(text.length)
  return { folded, map }
}

export const foldText = (text: string) => fold(text).folded

export const letterCount = (text: string) => text.match(/\p{L}/gu)?.length ?? 0

/** True when most letters are capitals – those lines get Title Case. */
export function isMostlyUpper(text: string): boolean {
  const all = letterCount(text)
  if (all < 2) return false
  const upper = text.match(/\p{Lu}/gu)?.length ?? 0
  return upper / all >= 0.7
}

// Edge characters that are OCR artefacts of textures, frames and glare, never label text.
const EDGE_JUNK = /^[|_~^*"“”„‚‹›«»<>[\]{}=+\\/#°•·:;,.\-—–!?©®]+|[|_~^*"“”„‚‹›«»<>[\]{}=+\\/#°•·:;\-—–!?©®]+$/gu

/**
 * Normalizes one OCR line: typographic apostrophes, whitespace, junk tokens without letters or
 * digits, and stray fragments at the edges (e.g. "i INNAMORATI ;" → "INNAMORATI").
 */
export function cleanLine(text: string): string {
  const tokens = text
    .replace(/[’‘`´]/g, "'")
    .replace(/\s*&\s*/g, ' & ')
    // OCR often drops the apostrophe of an elision: "D ABRUZZO" → "D'ABRUZZO".
    .replace(/(^|\s)([DdLl])\s+(?=[AEIOUaeiouÀ-Ýà-ý])/g, "$1$2'")
    .split(/\s+/)
    .map((t) => (t === '&' ? t : t.replace(EDGE_JUNK, '')))
    .filter((t) => t === '&' || /[\p{L}\p{N}]/u.test(t))
  // Texture and logo noise often leaves one- or two-letter fragments at the edges ("SA APPASSIMENTO FF").
  const stray = (t: string | undefined) =>
    t !== undefined &&
    t !== '&' &&
    ((letterCount(t) <= 2 && !/\d/.test(t) && !EDGE_WORDS.has(t.toLowerCase())) || /^\d{1,2}$/.test(t))
  if (tokens.some((t) => letterCount(t) >= 3)) {
    while (stray(tokens[0])) tokens.shift()
    while (stray(tokens[tokens.length - 1])) tokens.pop()
  }
  return tokens.join(' ').trim()
}

// Short words that really start or end label lines ("La Croix Belle", "Dr. Loosen", "Montepulciano d'").
const EDGE_WORDS = new Set(['la', 'le', 'el', 'il', 'lo', 'di', 'de', 'da', 'du', 'do', "d'", "l'", 'dr.', 'st.', 'gg'])

// Lowercase inside a name (not as first word): "Camp del Gal", "Trollinger mit Lemberger".
const PARTICLES = new Set([
  'di', 'de', 'del', 'della', 'delle', 'dei', 'degli', 'da', 'dal', 'dalla', 'du', 'des', 'von', 'vom',
  'van', 'der', 'und', 'mit', 'am', 'im', 'an', 'auf', 'zu', 'zum', 'zur', 'e', 'et', 'y', 'and', 'of',
  'the', 'en', 'au', 'aux', 'sur', 'sous',
])
// Elided particles before an apostrophe: "Montepulciano d'Abruzzo", "Nero d'Avola".
const ELIDED = new Set(['d', 'dell', 'dall', 'nell', 'sull', 'all'])
const KEEP_UPPER = new Set(['DOC', 'DOCG', 'IGT', 'IGP', 'AOC', 'AOP', 'VDP', 'GG', 'USA', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII'])

const capitalize = (w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()

/**
 * Title Case for ALL-CAPS label text; keeps "&", apostrophes, hyphens and wine acronyms.
 * readable-case.ts has a second Title Case with other word lists for the "Auf dem Etikett gefunden"
 * lines; merging them changes how names are written ("La" / "la"), so that needs a decision of its own.
 */
export function titleCase(text: string, continued = false): string {
  let first = !continued
  return text.replace(/[\p{L}\p{N}']+/gu, (word) => {
    const isFirst = first
    first = false
    if (KEEP_UPPER.has(word)) return word
    const apostrophe = word.indexOf("'")
    if (apostrophe > 0 && apostrophe <= 4 && word.length - apostrophe - 1 >= 2) {
      const prefix = word.slice(0, apostrophe).toLowerCase()
      const rest = capitalize(word.slice(apostrophe + 1))
      const head = !isFirst && ELIDED.has(prefix) ? prefix : capitalize(prefix)
      return `${head}'${rest}`
    }
    const lower = word.toLowerCase()
    if (!isFirst && PARTICLES.has(lower)) return lower
    return capitalize(word)
  })
}

/**
 * Title Case only when the line is set in capitals; mixed case stays as printed.
 * `continued`: the text continues a name from the line before, so its first word is not the start.
 */
export function displayCase(text: string, continued = false): string {
  return isMostlyUpper(text) ? titleCase(text, continued) : text
}
