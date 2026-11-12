// Builds public/data/wineries.json: a name-only list of wineries worldwide.
// Sources (see public/data/SOURCES.md):
//  - OpenStreetMap craft=winery with a name (one Overpass query, ODbL). shop=wine is left out on
//    purpose (merchants, not producers).
//  - Wikidata items that are instances of "winery" (Q156362) or a subclass, labels in
//    de/en/fr/it/es (CC0). The Spanish "cilla" tithe barns (Q2262049) are excluded.
// Only names are stored, no addresses or coordinates. Names with non-Latin scripts are dropped
// (labels are read by an OCR that only knows Latin text), duplicates are removed by a folded key.
// The output is sorted so that gzip/brotli compress it well.
// Usage: node scripts/build-wineries.mjs [--osm overpass.json] [--wikidata sparql.json]
import { readFile, writeFile } from 'node:fs/promises'

const UA = 'wine-tasting-reference-data/0.1'
const OUT = new URL('../public/data/wineries.json', import.meta.url)
const OVERPASS = 'https://overpass-api.de/api/interpreter'
const OSM_QUERY = '[out:json][timeout:500];nwr["craft"="winery"]["name"];out tags;'
const WD_QUERY = `SELECT ?l WHERE {
  ?w wdt:P31 ?c. ?c wdt:P279* wd:Q156362. FILTER(?c != wd:Q2262049)
  ?w rdfs:label ?l. FILTER(LANG(?l) IN ("de","en","fr","it","es")) }`

const arg = (name) => {
  const i = process.argv.indexOf(name)
  return i > 0 ? process.argv[i + 1] : null
}

async function loadOsm() {
  const f = arg('--osm')
  if (f) return JSON.parse(await readFile(f, 'utf8'))
  const res = await fetch(OVERPASS, {
    method: 'POST',
    headers: { 'User-Agent': UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ data: OSM_QUERY }),
  })
  if (!res.ok) throw new Error(`Overpass: ${res.status}`)
  return res.json()
}

async function loadWikidata() {
  const f = arg('--wikidata')
  if (f) return JSON.parse(await readFile(f, 'utf8'))
  const res = await fetch('https://query.wikidata.org/sparql', {
    method: 'POST',
    headers: { 'User-Agent': UA, Accept: 'application/sparql-results+json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ query: WD_QUERY }),
  })
  if (!res.ok) throw new Error(`Wikidata: ${res.status}`)
  return res.json()
}

const fold = (s) => s.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

function usable(raw) {
  const name = raw.replace(/\s+/g, ' ').trim()
  if (name.length < 4 || name.length > 80) return null
  const letters = name.match(/\p{L}/gu) ?? []
  if (letters.length < 3) return null
  const latin = letters.filter((c) => /\p{Script=Latin}/u.test(c)).length
  if (latin / letters.length < 0.9) return null
  return name
}

const osm = await loadOsm()
const wd = await loadWikidata()
const raw = [
  ...osm.elements.map((el) => el.tags?.name ?? ''),
  ...wd.results.bindings.map((b) => b.l.value),
]
const seen = new Map()
for (const r of raw) {
  const name = usable(r)
  if (!name) continue
  const key = fold(name)
  if (key.length < 4 || seen.has(key)) continue
  seen.set(key, name)
}
const names = [...seen.values()].sort((a, b) => a.localeCompare(b, 'en'))
const json = JSON.stringify(names)
await writeFile(OUT, json)
console.log(`${names.length} wineries (OSM ${osm.elements.length} elements, Wikidata ${wd.results.bindings.length} labels), ${Buffer.byteLength(json)} bytes`)
console.log(`OSM base: ${osm.osm3s?.timestamp_osm_base}`)
