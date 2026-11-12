// Fuzzy winery matching, pure and browser-safe. The list comes from
// public/data/wineries.json (names only).

const STOPWORDS = new Set([
  'weingut', 'weingueter', 'weinguter', 'winzerhof', 'weinhof', 'weinbau', 'weinkellerei', 'weinkeller',
  'kellerei', 'winzer', 'winzerei', 'winzergenossenschaft', 'winzerverein', 'domaine', 'domain', 'chateau',
  'cantina', 'cave', 'bodega', 'estate', 'wines', 'wine', 'vineyards', 'familie', 'fam', 'und', 'and', 'et',
  'von', 'vom', 'zu', 'zum', 'zur', 'der', 'die', 'das', 'dr', 'prof', 'gmbh', 'kg', 'eg', 'e', 'g', 'ohg',
  'gbr', 'co', 'sohn', 'sohne', 'erben', 'verwaltung',
])

// Words printed on labels that name wine, not a producer.
const GENERIC = new Set([
  'riesling', 'weiss', 'weisswein', 'rot', 'rotwein', 'rose', 'wein', 'trocken', 'halbtrocken', 'feinherb',
  'lieblich', 'suss', 'qualitatswein', 'pradikatswein', 'spatlese', 'auslese', 'kabinett', 'spatburgunder',
  'grauburgunder', 'weissburgunder', 'chardonnay', 'sauvignon', 'blanc', 'silvaner', 'thurgau',
  'gutswein', 'ortswein', 'lagenwein', 'jahrgang', 'gebiet', 'mosel', 'rheingau', 'pfalz', 'rheinhessen',
  'nahe', 'franken', 'baden', 'wurttemberg', 'ahr', 'mittelrhein', 'sekt', 'cuvee', 'reserve', 'alkohol',
  'enthalt', 'sulfite', 'abfuller', 'abfullung', 'erzeugerabfullung', 'deutschland', 'germany', 'product',
  'osterreich', 'austria', 'italia', 'vol',
])

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ß/g, 'ss')
    .replace(/æ/g, 'ae')
    .replace(/œ/g, 'oe')
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

// ä/ö/ü fold to a/o/u after NFKD; also accept the German ae/oe/ue spelling.
const fold = (t: string) => t.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u')

function tokens(text: string): string[] {
  return normalize(text).split(' ').filter(Boolean)
}

function coreTokens(text: string): string[] {
  return tokens(text).filter((t) => !STOPWORDS.has(t) && t.length > 1)
}

function distance(a: string, b: string): number {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

// 1 for equal (after umlaut folding), fuzzy for longer tokens (OCR noise), else 0.
function tokenSimilarity(a: string, b: string): number {
  if (a === b) return 1
  const fa = fold(a)
  const fb = fold(b)
  if (fa === fb) return 1
  const max = Math.max(fa.length, fb.length)
  if (Math.min(fa.length, fb.length) < 5) return 0
  const sim = 1 - distance(fa, fb) / max
  return sim >= 0.8 ? sim : 0
}

type Entry = { name: string; core: string[]; all: string; weight: number }
const cache = new WeakMap<string[], Entry[]>()

function entries(list: string[]): Entry[] {
  let e = cache.get(list)
  if (!e) {
    e = list.map((name) => {
      const core = coreTokens(name)
      return { name, core, all: normalize(name), weight: core.reduce((s, t) => s + t.length, 0) }
    })
    cache.set(list, e)
  }
  return e
}

const THRESHOLD = 0.85

/**
 * Best list entry for a piece of label text (a line or a few lines), or null.
 * Every distinctive word of the winery must appear in the text; extra words
 * in the text only lower the score slightly.
 */
export function matchWinery(text: string, list: string[]): string | null {
  // "Müller-Thurgau" is a grape, not a producer called Müller.
  const query = coreTokens(text.replace(/m(ü|ue?|u)ller[\s-]*thurgau/gi, ' ')).filter((t) => !GENERIC.has(fold(t)) || list.length === 0)
  if (query.length === 0) return null
  const queryWeight = query.reduce((s, t) => s + t.length, 0)
  if (queryWeight < 4) return null

  let best: { name: string; score: number } | null = null
  for (const entry of entries(list)) {
    if (entry.core.length === 0 || entry.weight < 4) continue
    let hit = 0
    let qHit = 0
    for (const ct of entry.core) {
      let top = 0
      for (const qt of query) top = Math.max(top, tokenSimilarity(ct, qt))
      hit += top * ct.length
    }
    for (const qt of query) {
      let top = 0
      for (const ct of entry.core) top = Math.max(top, tokenSimilarity(ct, qt))
      qHit += top * qt.length
    }
    const cc = hit / entry.weight
    const qc = qHit / queryWeight
    const score = cc * (0.5 + 0.5 * qc)
    // Prefer the shorter name on ties: "Weingut Dr. Loosen" over "... Erben".
    if (score >= THRESHOLD && (!best || score > best.score + 1e-9 || (Math.abs(score - best.score) < 1e-9 && entry.name.length < best.name.length))) {
      best = { name: entry.name, score }
    }
  }
  return best?.name ?? null
}

/** Autocomplete: names where every typed word starts a word of the name. */
export function searchWineries(query: string, list: string[], limit = 6): string[] {
  const q = tokens(query)
  if (q.length === 0 || normalize(query).length < 2) return []
  const typed = normalize(query)
  const ranked: { name: string; tier: number }[] = []
  for (const entry of entries(list)) {
    const words = entry.all.split(' ')
    if (!q.every((t) => words.some((w) => w.startsWith(t)))) continue
    const tier = entry.all.startsWith(typed) ? 0 : entry.core.join(' ').startsWith(typed) ? 1 : 2
    ranked.push({ name: entry.name, tier })
  }
  ranked.sort((a, b) => a.tier - b.tier || a.name.length - b.name.length || a.name.localeCompare(b.name, 'de'))
  return ranked.slice(0, limit).map((r) => r.name)
}
