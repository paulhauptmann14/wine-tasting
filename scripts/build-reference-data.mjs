// Builds public/data/appellations.json and public/data/sites.json for the label scan.
// Sources and licenses: public/data/SOURCES.md. Names only, no geometry.
//
//  appellations.json  Array<{ name, country, wineType? }>
//    EU eAmbrosia register, wine PDO/PGI with status "registered" (Latin-script names only).
//    `wineType` is set ONLY where the name implies the type unambiguously (see TYPE_RULES). Names
//    that are made in several colours (Sancerre, Rioja, Vouvray, Châteauneuf-du-Pape, Lambrusco, …)
//    stay without a type on purpose ("lieber leer als falsch").
//  sites.json         Array<{ name, village?, region }>
//    Official vineyard sites: RLP Weinbergsrolle (Einzellagen), Niederösterreich Rieden,
//    Südtirol Vigna-Bezeichnungen + zusätzliche geografische Bezeichnungen.
//
// Usage: node scripts/build-reference-data.mjs [--cache <dir>]
//   With --cache the raw downloads are read from / written to that directory (re-runs are offline).
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const UA = 'wine-tasting-reference-data/0.1'
const DATA = new URL('../public/data/', import.meta.url)
const cacheDir = process.argv.includes('--cache') ? process.argv[process.argv.indexOf('--cache') + 1] : null

async function getJson(key, url) {
  const file = cacheDir ? path.join(cacheDir, `${key}.json`) : null
  if (file) {
    try {
      return JSON.parse(await readFile(file, 'utf8'))
    } catch {}
  }
  const res = await fetch(url, { headers: { 'User-Agent': UA } })
  if (!res.ok) throw new Error(`${key}: ${res.status} ${url}`)
  const text = await res.text()
  if (file) {
    await mkdir(cacheDir, { recursive: true })
    await writeFile(file, text)
  }
  return JSON.parse(text)
}

const fold = (s) =>
  s.toLowerCase().replace(/ß/g, 'ss').normalize('NFKD').replace(/\p{M}/gu, '').replace(/[^a-z0-9]+/g, ' ').trim()

const isLatin = (s) => {
  const letters = s.match(/\p{L}/gu) ?? []
  return letters.length >= 3 && letters.every((c) => /\p{Script=Latin}/u.test(c))
}

// ---------------------------------------------------------------- appellations

// Hand-curated, matched against the folded name (lowercase, no accents, single spaces). Only names
// whose type is unambiguous in practice. Everything else gets no wineType.
const TYPE_RULES = [
  // sparkling
  ['sparkling', /^(champagne|prosecco|cava|asti|franciacorta|trento|alta langa|cremant .+|clairette de die|conegliano valdobbiadene prosecco|valdobbiadene prosecco|conegliano prosecco|asolo prosecco)$/],
  // red
  ['red', /^(barolo|barbaresco|chianti|chianti classico|brunello di montalcino|rosso di montalcino|amarone della valpolicella|vino nobile di montepulciano|taurasi|valpolicella|valpolicella ripasso|barbera d asti|dolcetto d asti|pauillac|saint julien|saint estephe|margaux|pomerol|saint emilion|saint emilion grand cru|medoc|haut medoc|moulis en medoc|listrac medoc|cornas|cote rotie|morgon|fleurie|moulin a vent|brouilly|cote de brouilly|chiroubles|chenas|julienas|saint amour|regnie)$/],
  // white
  ['white', /^(chablis|chablis grand cru|petit chablis|pouilly fume|muscadet|muscadet sevre et maine|muscadet coteaux de la loire|muscadet cotes de grandlieu|soave|soave superiore|gavi|cortese di gavi|vernaccia di san gimignano|orvieto|frascati|condrieu|savennieres|pouilly fuisse|pouilly loche|saint veran|entre deux mers|sauternes|barsac|monbazillac|montrachet|batard montrachet|tokaj|tokaji)$/],
  // rosé
  ['rose', /^(tavel|rose d anjou|rose de loire|rose des riceys|cabernet d anjou|cerasuolo d abruzzo)$/],
]

const typeFor = (name) => {
  const f = fold(name)
  for (const [type, re] of TYPE_RULES) if (re.test(f)) return type
  return undefined
}

async function buildAppellations() {
  const all = await getJson('eambrosia', 'https://webgate.ec.europa.eu/eambrosia-api/api/v1/geographical-indications')
  const wines = all.filter((g) => g.productType === 'WINE' && g.status === 'registered' && !g.removedFlag)
  const seen = new Map()
  for (const g of wines) {
    for (const raw of g.protectedNames ?? []) {
      const name = raw.replace(/\s+/g, ' ').trim()
      if (name.length < 3 || name.length > 80 || !isLatin(name)) continue
      const country = g.countries?.[0]
      if (!country) continue
      const key = `${country}|${fold(name)}`
      if (seen.has(key)) continue
      const wineType = typeFor(name)
      seen.set(key, wineType ? { name, country, wineType } : { name, country })
    }
  }
  const list = [...seen.values()].sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name, 'en'))
  const typed = list.filter((a) => a.wineType).length
  await writeFile(new URL('appellations.json', DATA), JSON.stringify(list))
  console.log(`appellations: ${list.length} (${typed} with wineType, from ${wines.length} registered wine GIs)`)
}

// ---------------------------------------------------------------- sites

const PLACEHOLDER = /ohne riednamen|keine subriede|keine riede|unbekannt/i

async function rlpSites() {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const url = `https://demo.ldproxy.net/vineyards/collections/vineyards/items?f=json&limit=1000&offset=${offset}&properties=name,region,village`
    const j = await getJson(`rlp-${offset}`, url)
    for (const f of j.features) {
      const { name, region, village } = f.properties
      if (!name) continue
      out.push({ name: name.trim(), ...(village ? { village: village.trim() } : {}), region: region?.trim() || 'Rheinland-Pfalz' })
    }
    if (j.features.length < 1000) break
  }
  return out
}

async function noeSites() {
  const url =
    'https://sdi.noe.gv.at/at.gv.noe.geoserver/OGD/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=OGD:RLF_WEINBAU_RIEDEN&outputFormat=application/json&propertyName=KGNAME,WEINBAURIEDE1,WEINBAURIEDE2'
  const j = await getJson('noe-rieden', url)
  const out = []
  for (const f of j.features) {
    const { KGNAME, WEINBAURIEDE1, WEINBAURIEDE2 } = f.properties
    for (const n of [WEINBAURIEDE1, WEINBAURIEDE2]) {
      if (!n || PLACEHOLDER.test(n)) continue
      out.push({ name: n.trim(), ...(KGNAME ? { village: KGNAME.trim() } : {}), region: 'Niederösterreich' })
    }
  }
  return out
}

// civis names are upper case ("GRAFENLEITEN"): title-case them, keep small connecting words lower.
const SMALL = new Set(['am', 'an', 'auf', 'bei', 'im', 'in', 'von', 'vom', 'zu', 'der', 'die', 'das', 'di', 'del', 'della', 'dei', 'de', 'dal', 'e', 'al', 'la', 'il', 'sul'])
function titleCase(s) {
  return s
    .toLowerCase()
    .split(/(?<=[\s'’-])/u)
    .map((part, i) => {
      const w = part.trim().replace(/[-'’]$/, '')
      return i > 0 && SMALL.has(w) ? part : part.replace(/^\p{L}/u, (c) => c.toUpperCase())
    })
    .join('')
}

async function suedtirolSites() {
  const base = 'https://geoservices6.civis.bz.it/geoserver/p_bz-Agriculture/ows?service=WFS&version=2.0.0&request=GetFeature&outputFormat=application/json&propertyName=NAME_DE,NAME_IT&typeNames='
  const out = []
  for (const layer of ['VineyardMentions', 'AdditionalGeographicalLocations']) {
    const j = await getJson(`suedtirol-${layer}`, base + `p_bz-Agriculture:${layer}`)
    for (const f of j.features) {
      const names = new Set([f.properties.NAME_DE, f.properties.NAME_IT].filter(Boolean).map((n) => titleCase(n.trim())))
      for (const name of names) out.push({ name, region: 'Südtirol' })
    }
  }
  return out
}

async function buildSites() {
  const parts = { rlp: await rlpSites(), noe: await noeSites(), st: await suedtirolSites() }
  const seen = new Map()
  for (const s of Object.values(parts).flat()) {
    if (s.name.length < 3 || s.name.length > 60) continue
    const key = `${fold(s.name)}|${fold(s.village ?? '')}|${s.region}`
    if (!seen.has(key)) seen.set(key, s)
  }
  const list = [...seen.values()].sort((a, b) => a.region.localeCompare(b.region) || a.name.localeCompare(b.name, 'de') || (a.village ?? '').localeCompare(b.village ?? '', 'de'))
  await writeFile(new URL('sites.json', DATA), JSON.stringify(list))
  console.log(`sites: ${list.length} (RLP ${parts.rlp.length}, NÖ ${parts.noe.length}, Südtirol ${parts.st.length} before dedupe)`)
}

await buildAppellations()
await buildSites()
