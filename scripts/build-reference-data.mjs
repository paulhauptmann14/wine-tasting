// Builds public/data/appellations.json and public/data/sites.json for the label scan.
// Sources and licenses: public/data/SOURCES.md. Names only, no geometry.
//
//  appellations.json  Array<{ name, country, wineType?, grapes?, mainGrape?, sources? }>
//    EU eAmbrosia register, wine PDO/PGI with status "registered" (Latin-script names only).
//    `wineType`  only where the appellation allows exactly one colour: names that imply it (TYPE_RULES),
//                the verified rules (VERIFIED) and Wikidata where it names exactly one colour and nothing
//                contradicts it. Names made in several colours (Sancerre, Rioja, Lambrusco, …) stay without
//                a type on purpose ("lieber leer als falsch").
//    `grapes`    typical grapes, most important first, canonical names of GRAPES in
//                src/lib/label/dictionaries.ts: from VERIFIED, else Wikidata P186 ("made from material").
//    `mainGrape` only from VERIFIED: the product specification requires >= 85 % of that grape (the EU
//                threshold for naming one variety) for every wine of the grape's colour, for every wine
//                when `wineType` is set. Always grapes[0].
//    `sources`   where the rules behind `mainGrape` / `wineType` (VERIFIED, IT_ONE_COLOUR) can be checked:
//                for Italy the appellation's entry in eAmbrosia, for France the cahier des charges.
//  sites.json         Array<{ name, village?, region }>
//    Official vineyard sites: RLP Weinbergsrolle (Einzellagen), Niederösterreich Rieden,
//    Südtirol Vigna-Bezeichnungen + zusätzliche geografische Bezeichnungen.
//
// Usage: node scripts/build-reference-data.mjs [--cache <dir>] [--only appellations|sites]
//   With --cache the raw downloads (eAmbrosia, Wikidata, sites) are read from / written to that
//   directory, so re-runs are offline and reproducible. Needs Node with TypeScript type stripping
//   (22.18+), it reads GRAPES from src/lib/label/dictionaries.ts.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { GRAPE_PLACES, GRAPES } from '../src/lib/label/dictionaries.ts'

const UA = 'wine-tasting-reference-data/0.1'
const DATA = new URL('../public/data/', import.meta.url)
const arg = (flag) => (process.argv.includes(flag) ? process.argv[process.argv.indexOf(flag) + 1] : null)
const cacheDir = arg('--cache')
const only = arg('--only')

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** One request at a time with a pause; on 429/503 waits (Retry-After) and tries again. */
async function politeFetch(key, url) {
  for (let attempt = 0; ; attempt++) {
    await sleep(1000)
    const res = await fetch(url, { headers: { 'User-Agent': UA } })
    if (res.ok) return res.text()
    if ((res.status === 429 || res.status === 503) && attempt < 5) {
      await sleep(1000 * (Number(res.headers.get('retry-after')) || 30))
      continue
    }
    throw new Error(`${key}: ${res.status} ${url}`)
  }
}

async function getJson(key, url) {
  const file = cacheDir ? path.join(cacheDir, `${key}.json`) : null
  if (file) {
    try {
      return JSON.parse(await readFile(file, 'utf8'))
    } catch {}
  }
  const text = await politeFetch(key, url)
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
// whose type is unambiguous in practice. Everything else gets no wineType from here.
const TYPE_RULES = [
  // sparkling
  // Not "Trento": the Trento DOC is sparkling only, but the word is mostly the town or province on Trentino labels.
  ['sparkling', /^(champagne|prosecco|cava|asti|franciacorta|alta langa|cremant .+|clairette de die|conegliano valdobbiadene prosecco|valdobbiadene prosecco|conegliano prosecco|asolo prosecco)$/],
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

// ---- verified rules
//
// Checked by hand in the product specification (disciplinare / cahier des charges / regulation),
// November 2026. `mainGrape` only where the specification requires ≥ 85 % (or 100 %) of that grape for
// every wine of its colour (with `wineType`: for every wine). `rule` quotes the specification. Entries
// without `mainGrape` and `wineType` only give typical grapes for suggestions. Grape names are the
// canonical names of GRAPES (Spätburgunder = Pinot Noir, Muskateller = Moscato bianco, …).
//
// Italy: MASAF, "Disciplinari di produzione vini DOP" (consolidated texts), article 2 "Base ampelografica",
// read in the three archives by initial letter linked from
// https://www.masaf.gov.it/flex/cm/pages/ServeBLOB.php/L/IT/IDPagina/4625 (November 2026):
//   A–D https://www.masaf.gov.it/flex/cm/pages/ServeAttachment.php/L/IT/D/1%252Fa%252F5%252FD.109d6a097078b9137376/P/BLOB%3AID%3D4625/E/7z?mode=download
//   E–N https://www.masaf.gov.it/flex/cm/pages/ServeAttachment.php/L/IT/D/1%252F1%252F3%252FD.f18c8d53342c05dcc620/P/BLOB%3AID%3D4625/E/7z?mode=download
//   O–Z https://www.masaf.gov.it/flex/cm/pages/ServeAttachment.php/L/IT/D/1%252F9%252F5%252FD.d00b2121a0e2582372bf/P/BLOB%3AID%3D4625/E/7z?mode=download
// The archive links change with every update, so the data links each appellation's own entry in the EU
// register eAmbrosia (stable, with the specification's single document and amendments). The constants
// keep the split by letter for readers.
const eAmbrosiaEntry = (a) => `https://ec.europa.eu/agriculture/eambrosia/geographical-indications-register/details/${a._gi}`
const IT_A_D = eAmbrosiaEntry
const IT_E_N = eAmbrosiaEntry
const IT_O_Z = eAmbrosiaEntry
/** The source URL of a rule for one appellation: fixed, or per appellation (eAmbrosia entry). */
const sourceFor = (source, a) => (typeof source === 'function' ? source(a) : source)
// France: INAO cahier des charges ("V. Encépagement", "III. Couleur et types de produit"), linked from the
// product page on https://www.inao.gouv.fr (extranet.inao.gouv.fr or the Bulletin officiel du ministère).
const BO = (id) => `https://info.agriculture.gouv.fr/boagri/document_administratif-${id}/telechargement`
const BO2 = (id) => `https://info.agriculture.gouv.fr/gedei/site/bo-agri/document_administratif-${id}/telechargement`
const INAO = (file) => `https://extranet.inao.gouv.fr/fichier/${file}`
const GAMAY_CRU = 'cépage principal gamay N; cépages accessoires (aligoté, chardonnay, melon) ≤ 15 % per parcel; red only'

const VERIFIED = [
  // ---- Italy, ≥ 85 % of one grape
  { country: 'IT', names: ['Barolo'], wineType: 'red', grapes: ['Nebbiolo'], mainGrape: 'Nebbiolo', source: IT_A_D, rule: 'vini rossi; esclusivamente dal vitigno Nebbiolo' },
  { country: 'IT', names: ['Barbaresco'], wineType: 'red', grapes: ['Nebbiolo'], mainGrape: 'Nebbiolo', source: IT_A_D, rule: 'vini rossi; esclusivamente dal vitigno Nebbiolo' },
  { country: 'IT', names: ['Brunello di Montalcino'], wineType: 'red', grapes: ['Sangiovese'], mainGrape: 'Sangiovese', source: IT_A_D, rule: 'vino rosso; esclusivamente dal vitigno Sangiovese' },
  { country: 'IT', names: ['Rosso di Montalcino'], wineType: 'red', grapes: ['Sangiovese'], mainGrape: 'Sangiovese', source: IT_O_Z, rule: 'esclusivamente dal vitigno Sangiovese; colore rosso rubino' },
  { country: 'IT', names: ['Morellino di Scansano'], wineType: 'red', grapes: ['Sangiovese'], mainGrape: 'Sangiovese', source: IT_E_N, rule: 'vini rossi; Sangiovese minimo 85 % (riserva 90 %)' },
  { country: 'IT', names: ['Montepulciano d\'Abruzzo'], wineType: 'red', grapes: ['Montepulciano'], mainGrape: 'Montepulciano', source: IT_E_N, rule: 'Montepulciano almeno 85 %; colore rosso rubino' },
  { country: 'IT', names: ['Cerasuolo d\'Abruzzo'], wineType: 'rose', grapes: ['Montepulciano'], mainGrape: 'Montepulciano', source: IT_A_D, rule: 'Montepulciano almeno 85 %' },
  { country: 'IT', names: ['Trebbiano d\'Abruzzo'], wineType: 'white', grapes: ['Trebbiano'], mainGrape: 'Trebbiano', source: IT_O_Z, rule: 'Trebbiano abruzzese e/o Trebbiano toscano almeno 85 %; colore giallo paglierino' },
  { country: 'IT', names: ['Primitivo di Manduria'], wineType: 'red', grapes: ['Primitivo'], mainGrape: 'Primitivo', source: IT_O_Z, rule: 'vini rossi; Primitivo minimo 85 %' },
  // No mainGrape: the red "Salice Salentino Aleatico" is Aleatico, so not every red wine is Negroamaro.
  { country: 'IT', names: ['Salice Salentino'], grapes: ['Negroamaro', 'Chardonnay'], rule: 'rosso e rosato: Negroamaro almeno 85 %; rosso "Aleatico": Aleatico 85 %; bianco: Chardonnay, Pinot bianco, Fiano, Verdeca' },
  { country: 'IT', names: ['Taurasi'], wineType: 'red', grapes: ['Aglianico'], mainGrape: 'Aglianico', source: IT_O_Z, rule: 'vini rossi; Aglianico, altri vitigni a bacca rossa fino a 15 %' },
  { country: 'IT', names: ['Aglianico del Vulture'], grapes: ['Aglianico'], mainGrape: 'Aglianico', source: IT_A_D, rule: 'Aglianico del Vulture e/o Aglianico (100 %); also spumante' },
  { country: 'IT', names: ['Montefalco Sagrantino'], wineType: 'red', grapes: ['Sagrantino'], mainGrape: 'Sagrantino', source: IT_E_N, rule: 'vino rosso; esclusivamente dal vitigno Sagrantino' },
  { country: 'IT', names: ['Barbera d\'Asti'], wineType: 'red', grapes: ['Barbera'], mainGrape: 'Barbera', source: IT_A_D, rule: 'vini rossi; Barbera minimo 90 %' },
  { country: 'IT', names: ['Barbera d\'Alba'], wineType: 'red', grapes: ['Barbera'], mainGrape: 'Barbera', source: IT_A_D, rule: 'vini rossi; Barbera dall\'85 % al 100 %' },
  { country: 'IT', names: ['Dolcetto d\'Alba'], wineType: 'red', grapes: ['Dolcetto'], mainGrape: 'Dolcetto', source: IT_A_D, rule: 'vini rossi; vitigno Dolcetto' },
  { country: 'IT', names: ['Dolcetto d\'Asti'], wineType: 'red', grapes: ['Dolcetto'], mainGrape: 'Dolcetto', source: IT_A_D, rule: 'vino rosso; vitigno Dolcetto' },
  { country: 'IT', names: ['Nebbiolo d\'Alba'], grapes: ['Nebbiolo'], mainGrape: 'Nebbiolo', source: IT_E_N, rule: 'vitigno Nebbiolo; also spumante rosso, rosato and bianco' },
  { country: 'IT', names: ['Roero'], grapes: ['Nebbiolo', 'Arneis'], mainGrape: 'Nebbiolo', source: IT_O_Z, rule: 'rosso: Nebbiolo minimo 95 %; bianco: Arneis' },
  { country: 'IT', names: ['Gattinara'], wineType: 'red', grapes: ['Nebbiolo'], mainGrape: 'Nebbiolo', source: IT_E_N, rule: 'Nebbiolo (Spanna) dal 90 al 100 %; colore rosso granato' },
  { country: 'IT', names: ['Ghemme'], wineType: 'red', grapes: ['Nebbiolo'], mainGrape: 'Nebbiolo', source: IT_E_N, rule: 'vini rossi; Nebbiolo, Vespolina e Uva Rara fino a 15 %' },
  { country: 'IT', names: ['Valtellina Superiore'], wineType: 'red', grapes: ['Nebbiolo'], mainGrape: 'Nebbiolo', source: IT_O_Z, rule: 'Nebbiolo (Chiavennasca) minimo 90 %; colore rosso rubino' },
  { country: 'IT', names: ['Sforzato di Valtellina', 'Sfursat di Valtellina'], wineType: 'red', grapes: ['Nebbiolo'], mainGrape: 'Nebbiolo', source: IT_O_Z, rule: 'Nebbiolo (Chiavennasca) minimo 90 %; colore rosso rubino' },
  { country: 'IT', names: ['Teroldego Rotaliano'], grapes: ['Teroldego'], mainGrape: 'Teroldego', source: IT_O_Z, rule: 'dal vitigno Teroldego; rosso and rosato' },
  { country: 'IT', names: ['Cannonau di Sardegna'], grapes: ['Grenache'], mainGrape: 'Grenache', source: IT_A_D, rule: 'Cannonau minimo 85 %; rosso, rosato, passito, liquoroso' },
  { country: 'IT', names: ['Vermentino di Gallura'], wineType: 'white', grapes: ['Vermentino'], mainGrape: 'Vermentino', source: IT_O_Z, rule: 'Vermentino minimo 95 %; colore giallo paglierino (also frizzante/spumante)' },
  { country: 'IT', names: ['Vermentino di Sardegna'], grapes: ['Vermentino'], mainGrape: 'Vermentino', source: IT_O_Z, rule: 'Vermentino minimo 85 %' },
  { country: 'IT', names: ['Verdicchio dei Castelli di Jesi'], grapes: ['Verdicchio'], mainGrape: 'Verdicchio', source: IT_O_Z, rule: 'Verdicchio minimo 85 %' },
  { country: 'IT', names: ['Greco di Tufo'], wineType: 'white', grapes: ['Greco'], mainGrape: 'Greco', source: IT_E_N, rule: 'vini bianchi; Greco minimo 85 %, Coda di Volpe massimo 15 %' },
  { country: 'IT', names: ['Fiano di Avellino'], wineType: 'white', grapes: ['Fiano'], mainGrape: 'Fiano', source: IT_E_N, rule: 'vini bianchi; Fiano minimo 85 %' },
  { country: 'IT', names: ['Gavi', 'Cortese di Gavi'], wineType: 'white', grapes: ['Cortese'], mainGrape: 'Cortese', source: IT_E_N, rule: 'vini bianchi; dal solo vitigno Cortese' },
  { country: 'IT', names: ['Lugana'], wineType: 'white', grapes: ['Turbiana'], mainGrape: 'Turbiana', source: IT_E_N, rule: 'vini bianchi; Trebbiano di Soave (Turbiana, Trebbiano di Lugana), altri vitigni fino a 10 %' },
  { country: 'IT', names: ['Prosecco'], wineType: 'sparkling', grapes: ['Glera'], mainGrape: 'Glera', source: IT_O_Z, rule: 'Glera, altri vitigni fino a 15 %; spumante rosé Glera 85–90 %' },
  { country: 'IT', names: ['Conegliano Valdobbiadene - Prosecco', 'Conegliano - Prosecco', 'Valdobbiadene - Prosecco'], wineType: 'sparkling', grapes: ['Glera'], mainGrape: 'Glera', source: IT_A_D, rule: 'Glera, altri vitigni fino a 15 %' },
  { country: 'IT', names: ['Asolo Prosecco'], wineType: 'sparkling', grapes: ['Glera'], mainGrape: 'Glera', source: IT_A_D, rule: 'Glera, altri vitigni fino a 15 %' },
  // Lambrusco is one entry in GRAPES (a family of varieties): every Lambrusco variety counts.
  // These three are made only as spumante and frizzante (article 1); frizzante counts as sparkling in the app.
  { country: 'IT', names: ['Lambrusco di Sorbara'], wineType: 'sparkling', grapes: ['Lambrusco'], mainGrape: 'Lambrusco', source: IT_E_N, rule: 'rosso/rosato/bianco spumante, rosso/rosato frizzante; Lambrusco di Sorbara minimo 60 %, Lambrusco Salamino, altri Lambruschi: 100 % Lambrusco' },
  { country: 'IT', names: ['Lambrusco Grasparossa di Castelvetro'], wineType: 'sparkling', grapes: ['Lambrusco'], mainGrape: 'Lambrusco', source: IT_E_N, rule: 'rosso/rosato spumante e frizzante; Lambrusco Grasparossa minimo 85 %' },
  { country: 'IT', names: ['Lambrusco Salamino di Santa Croce'], wineType: 'sparkling', grapes: ['Lambrusco'], mainGrape: 'Lambrusco', source: IT_E_N, rule: 'rosso/rosato spumante e frizzante; Lambrusco Salamino minimo 85 %' },
  { country: 'IT', names: ['Lambrusco Mantovano'], grapes: ['Lambrusco'], mainGrape: 'Lambrusco', source: IT_E_N, rule: 'Lambrusco Viadanese, Maestri, Marani, Salamino almeno 85 %' },
  // ---- Italy, blends or < 85 %: typical grapes only
  { country: 'IT', names: ['Vino Nobile di Montepulciano'], grapes: ['Sangiovese'], rule: 'Sangiovese minimo 70 %' },
  { country: 'IT', names: ['Rosso di Montepulciano'], grapes: ['Sangiovese'] },
  { country: 'IT', names: ['Chianti'], grapes: ['Sangiovese'], rule: 'Sangiovese da 70 a 100 %' },
  { country: 'IT', names: ['Chianti Classico'], grapes: ['Sangiovese'], rule: 'Sangiovese dall\'80 al 100 %' },
  { country: 'IT', names: ['Amarone della Valpolicella', 'Valpolicella', 'Valpolicella Ripasso', 'Recioto della Valpolicella'], grapes: ['Corvina', 'Corvinone', 'Rondinella'], rule: 'Corvina e/o Corvinone 45–95 %, Rondinella 5–30 %' },
  { country: 'IT', names: ['Bardolino'], grapes: ['Corvina', 'Rondinella'], rule: 'Corvina 35–95 %, Rondinella 5–40 %; also Chiaretto (rosé)' },
  { country: 'IT', names: ['Soave', 'Soave Superiore'], grapes: ['Garganega', 'Trebbiano', 'Chardonnay'], rule: 'Garganega almeno 70 %' },
  { country: 'IT', names: ['Asti'], grapes: ['Muskateller'], rule: 'Moscato bianco ≥ 97 %, but Asti rosé only 70–90 %' },
  { country: 'IT', names: ['Franciacorta'], grapes: ['Chardonnay', 'Spätburgunder', 'Weißburgunder'], rule: 'Chardonnay e/o Pinot nero, Pinot bianco fino a 50 %' },
  { country: 'IT', names: ['Frascati'], grapes: ['Malvasia', 'Trebbiano'], rule: 'Malvasia minimo 70 %' },
  { country: 'IT', names: ['Orvieto'], grapes: ['Trebbiano'], rule: 'Trebbiano toscano e Grechetto minimo 60 %' },
  { country: 'IT', names: ['Etna'], grapes: ['Nerello Mascalese'], rule: 'bianco: Carricante; rosso/rosato: Nerello Mascalese' },
  { country: 'IT', names: ['delle Venezie'], grapes: ['Grauburgunder'], rule: '"delle Venezie" Pinot grigio: Pinot grigio minimo 85 %; also bianco' },
  { country: 'IT', names: ['Vin Santo di Montepulciano'], grapes: ['Malvasia', 'Trebbiano'], rule: 'Malvasia bianca, Grechetto, Trebbiano toscano minimo 70 %; occhio di pernice: Sangiovese' },
  { country: 'IT', names: ['Cerasuolo di Vittoria'], wineType: 'red', grapes: ['Nero d\'Avola', 'Frappato'], source: IT_A_D, rule: 'Nero d\'Avola 50–70 %, Frappato 30–50 %; red' },
  // ---- France, ≥ 85 % of one grape
  { country: 'FR', names: ['Chablis'], wineType: 'white', grapes: ['Chardonnay'], mainGrape: 'Chardonnay', source: INAO('CDC-Chablis-250623-PNO.pdf'), rule: 'vins tranquilles blancs; exclusivement du cépage chardonnay B' },
  { country: 'FR', names: ['Petit Chablis'], wineType: 'white', grapes: ['Chardonnay'], mainGrape: 'Chardonnay', source: BO2('580ac589-2817-4f2f-85ee-35292c4b5057'), rule: 'vins tranquilles blancs; exclusivement du cépage chardonnay B' },
  { country: 'FR', names: ['Chablis grand cru'], wineType: 'white', grapes: ['Chardonnay'], mainGrape: 'Chardonnay', source: BO('f26dd8c5-103a-488e-9bd8-069c6053f605'), rule: 'vins tranquilles blancs; exclusivement du cépage chardonnay B' },
  { country: 'FR', names: ['Pouilly-Fuissé'], wineType: 'white', grapes: ['Chardonnay'], mainGrape: 'Chardonnay', source: BO2('4cfb89bd-e375-438d-90ff-d88fb1a54e0a'), rule: 'vins tranquilles blancs; du seul cépage chardonnay B' },
  { country: 'FR', names: ['Saint-Véran'], wineType: 'white', grapes: ['Chardonnay'], mainGrape: 'Chardonnay', source: BO2('3347bbb6-daf8-46cf-acd2-eadb38e54177'), rule: 'vins tranquilles blancs; du seul cépage chardonnay B' },
  { country: 'FR', names: ['Sancerre'], grapes: ['Sauvignon Blanc', 'Spätburgunder'], mainGrape: 'Sauvignon Blanc', source: BO('c5b06e73-5c8e-40fc-81cb-26d1b8a0135a'), rule: 'blancs: du seul cépage sauvignon B; rouges et rosés: du seul cépage pinot noir N' },
  { country: 'FR', names: ['Pouilly-Fumé', 'Blanc Fumé de Pouilly'], wineType: 'white', grapes: ['Sauvignon Blanc'], mainGrape: 'Sauvignon Blanc', source: BO('78d2537d-c224-4d0f-9ce7-b90dcb19621c'), rule: 'vins tranquilles blancs; cépage sauvignon B' },
  { country: 'FR', names: ['Muscadet'], wineType: 'white', grapes: ['Melon de Bourgogne'], mainGrape: 'Melon de Bourgogne', source: INAO('2f-PRJ-CDC-Muscadet-post-CE.pdf'), rule: 'vins blancs tranquilles; melon B, chardonnay B ≤ 10 %' },
  { country: 'FR', names: ['Muscadet Sèvre et Maine'], wineType: 'white', grapes: ['Melon de Bourgogne'], mainGrape: 'Melon de Bourgogne', source: INAO('2e-PRJ-CDC-Muscadet-Sevre-et-Maine-post-CE.pdf'), rule: 'vins blancs tranquilles; du seul cépage melon B' },
  { country: 'FR', names: ['Savennières'], wineType: 'white', grapes: ['Chenin Blanc'], mainGrape: 'Chenin Blanc', source: BO2('b6b7eb17-5cdf-4903-b920-dfe17c062148'), rule: 'vins blancs tranquilles; cépage chenin B' },
  { country: 'FR', names: ['Vouvray'], grapes: ['Chenin Blanc'], mainGrape: 'Chenin Blanc', source: BO2('bf141eb3-e0b2-44aa-aea9-bfb05bdb761c'), rule: 'blancs tranquilles, mousseux et pétillants; chenin B, orbois B ≤ 5 %' },
  { country: 'FR', names: ['Condrieu'], wineType: 'white', grapes: ['Viognier'], mainGrape: 'Viognier', source: INAO('PNO2023AOPCondrieu.pdf'), rule: 'vins tranquilles blancs; cépage viognier B' },
  { country: 'FR', names: ['Cornas'], wineType: 'red', grapes: ['Syrah'], mainGrape: 'Syrah', source: INAO('PNO2023AOPCornas.pdf'), rule: 'vins rouges; cépage syrah N' },
  { country: 'FR', names: ['Hermitage', 'L\'Hermitage'], grapes: ['Syrah', 'Marsanne', 'Roussanne'], mainGrape: 'Syrah', source: BO('44a11782-ba80-4c0e-85ef-6acd35675371'), rule: 'rouges: syrah N ≥ 85 %; blancs: marsanne B, roussanne B' },
  { country: 'FR', names: ['Crozes-Hermitage'], grapes: ['Syrah', 'Marsanne', 'Roussanne'], mainGrape: 'Syrah', source: INAO('PNO2024AOPCrozesHermitage.pdf'), rule: 'rouges: syrah N ≥ 85 %; blancs: marsanne B, roussanne B' },
  { country: 'FR', names: ['Saint-Joseph'], grapes: ['Syrah', 'Marsanne', 'Roussanne'], mainGrape: 'Syrah', source: INAO('PNO2023SaintJoseph.pdf'), rule: 'rouges: syrah N ≥ 90 %; blancs: marsanne B, roussanne B' },
  { country: 'FR', names: ['Côte de Nuits-Villages', 'Vins fins de la Côte de Nuits'], grapes: ['Spätburgunder', 'Chardonnay', 'Weißburgunder'], mainGrape: 'Spätburgunder', source: BO('98aae6b4-7bd9-478d-803a-01fffb18ccfa'), rule: 'rouges: pinot noir N, accessoires ≤ 15 %; blancs: chardonnay B et pinot blanc B' },
  { country: 'FR', names: ['Brouilly'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: INAO('PNO-CDCBrouilly-CN221130.pdf'), rule: GAMAY_CRU },
  { country: 'FR', names: ['Côte de Brouilly'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: BO2('9a5daa4c-32de-4338-85f4-fb9e498f7eef'), rule: GAMAY_CRU },
  { country: 'FR', names: ['Chiroubles'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: INAO('PNO-CDCChiroubles-CN221130.pdf'), rule: GAMAY_CRU },
  { country: 'FR', names: ['Fleurie'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: INAO('PNO-CDCFleurie-CN221130.pdf'), rule: GAMAY_CRU },
  { country: 'FR', names: ['Juliénas'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: BO2('422ba4b6-770d-49ec-b732-5f1cd355262f'), rule: GAMAY_CRU },
  { country: 'FR', names: ['Morgon'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: INAO('PNO-CDCMorgon-221130.pdf'), rule: GAMAY_CRU },
  { country: 'FR', names: ['Moulin-à-Vent'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: BO2('3e52072d-1333-410e-8072-13a856496259'), rule: GAMAY_CRU },
  { country: 'FR', names: ['Régnié'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: BO2('325ca43d-881a-4b3a-b1ef-b1a8d920292d'), rule: GAMAY_CRU },
  { country: 'FR', names: ['Saint-Amour'], wineType: 'red', grapes: ['Gamay'], mainGrape: 'Gamay', source: BO2('1c62365f-4b31-4968-ae2c-015eba7aba0d'), rule: GAMAY_CRU },
  // ---- France, blends or < 85 %: typical grapes only
  { country: 'FR', names: ['Chénas'], grapes: ['Gamay'], rule: 'specification not checked (the linked document was the Beaujolais single document)' },
  { country: 'FR', names: ['Beaujolais'], grapes: ['Gamay', 'Chardonnay'] },
  { country: 'FR', names: ['Côte Rôtie'], grapes: ['Syrah', 'Viognier'], rule: 'syrah N ≥ 80 %, viognier B' },
  { country: 'FR', names: ['Bourgogne'], grapes: ['Spätburgunder', 'Chardonnay'], rule: 'rouges: pinot noir N, also césar and gamay; blancs: chardonnay B, pinot blanc B, pinot gris ≤ 30 %' },
  { country: 'FR', names: ['Champagne'], grapes: ['Chardonnay', 'Spätburgunder', 'Schwarzriesling'], rule: 'cépages principaux: chardonnay, meunier, pinot noir, arbane, petit meslier, pinot blanc, pinot gris' },
  { country: 'FR', names: ['Côtes du Rhône', 'Côtes du Rhône Villages', 'Châteauneuf-du-Pape'], grapes: ['Grenache', 'Syrah', 'Mourvèdre'], rule: 'rouges: grenache N, mourvèdre N, syrah N principaux' },
  { country: 'FR', names: ['Bordeaux', 'Bordeaux supérieur'], grapes: ['Merlot', 'Cabernet Sauvignon', 'Cabernet Franc', 'Sauvignon Blanc', 'Sémillon'], rule: 'rouges: cabernet-sauvignon, cabernet franc, merlot, …; blancs: sémillon, sauvignon, …' },
  // ---- Spain, Portugal, Austria: typical grapes only (blends or < 85 %)
  { country: 'ES', names: ['Rioja'], grapes: ['Tempranillo', 'Grenache', 'Graciano', 'Carignan', 'Macabeo'] },
  { country: 'ES', names: ['Ribera del Duero'], grapes: ['Tempranillo', 'Cabernet Sauvignon', 'Merlot'], rule: 'Tempranillo (Tinta del País) ≥ 75 %' },
  { country: 'ES', names: ['Rías Baixas'], grapes: ['Albariño', 'Loureiro'] },
  { country: 'ES', names: ['Rueda'], grapes: ['Verdejo', 'Sauvignon Blanc'], rule: 'Rueda: Verdejo 50 %; Rueda Verdejo 85 %' },
  { country: 'ES', names: ['Cava'], grapes: ['Macabeo', 'Xarel-lo', 'Parellada', 'Chardonnay'] },
  { country: 'ES', names: ['Priorat'], grapes: ['Grenache', 'Carignan'] },
  { country: 'PT', names: ['Vinho Verde'], grapes: ['Albariño', 'Loureiro', 'Arinto'] },
  { country: 'AT', names: ['Weinviertel'], grapes: ['Grüner Veltliner'], rule: 'Weinviertel DAC: Grüner Veltliner (≥ 85 %), but "Weinviertel" alone is not always DAC' },
  { country: 'AT', names: ['Wachau', 'Kamptal', 'Kremstal'], grapes: ['Grüner Veltliner', 'Riesling'] },
]

// Italian DOPs whose disciplinare allows one colour only (or only sparkling wine): article 1 names no other colour, every
// "colore:" in article 6 (characteristics at release) is red (rosso rubino, granato, …) or white (giallo
// paglierino, dorato, …), and the text mentions no rosé type (rosato, chiaretto, ramato, occhio di
// pernice, …). Derived from the MASAF archives above (text extracted from the PDFs, Nov 2026) and read
// through by hand. Left out: short alternative names that are mainly towns ("Alba", "Acqui",
// "Montello", …), so a town in the small print cannot set a type.
const IT_ONE_COLOUR = [
  ['red', IT_A_D, [
    'Aglianico del Vulture Superiore', 'Aglianico del Vulture', 'Aleatico di Gradoli', 'Aleatico di Puglia',
    'Bagnoli Friularo', "Barbera d'Alba", 'Bardolino Superiore', 'Bolgheri Sassicaia',
    "Bonarda dell'Oltrepò Pavese", 'Bramaterra', "Cacc'e mmitte di Lucera", 'Campidano di Terralba', 'Carema',
    'Carmignano', 'Castel del Monte Nero di Troia Riserva', 'Castel del Monte Rosso Riserva',
    'Cesanese del Piglio', 'Cesanese di Affile', 'Cesanese di Olevano Romano', 'Cirò Classico', "Cisterna d'Asti",
    'Colline Teramane Montepulciano d’Abruzzo', 'Cònero', 'Rubino di Cantavenna', 'Dogliani', "Dolcetto d'Acqui",
    "Dolcetto d'Alba", "Dolcetto di Diano d'Alba", 'Dolcetto di Ovada Superiore', 'Dolcetto di Ovada',
  ]],
  ['red', IT_E_N, [
    'Elba Aleatico Passito', "Aleatico Passito dell'Elba", 'Gattinara', 'Ghemme', 'Girò di Cagliari',
    "Grignolino d'Asti", 'Gutturnio', 'I Terreni di Sanseverino', 'Lacrima di Morro', "Lacrima di Morro d'Alba",
    'Lago di Caldaro', 'Lessona', 'Monica di Sardegna', 'Montecucco Sangiovese', 'Montefalco Sagrantino',
    'Montello Rosso', "Montepulciano d'Abruzzo", 'Morellino di Scansano',
  ]],
  ['red', IT_O_Z, [
    'Piave Malanotte', 'Malanotte del Piave', "Pinot nero dell'Oltrepò Pavese",
    'Primitivo di Manduria Dolce Naturale', 'Primitivo di Manduria', 'Recioto della Valpolicella',
    'Rossese di Dolceacqua', 'Rosso Cònero', 'Rosso Orvietano', 'Rosso Piceno', 'Rosso di Montepulciano',
    'Ruchè di Castagnole Monferrato', 'San Ginesio', "Sangue di Giuda dell'Oltrepò Pavese",
    'Sforzato di Valtellina', 'Sfursat di Valtellina', 'Sizzano', 'Torgiano Rosso Riserva', 'Val di Cornia Rosso',
    'Rosso della Val di Cornia', 'Valtellina rosso', 'Rosso di Valtellina', 'Valtellina Superiore',
  ]],
  // Article 1: "riservata al vino spumante nelle tipologie secco e dolce" (red sparkling wine)
  ['sparkling', IT_O_Z, ['Vernaccia di Serrapetrona']],
  ['white', IT_A_D, [
    "Ansonica Costa dell'Argentario", 'Aversa', 'Bianchello del Metauro', 'Bianco Capena', "Bianco dell'Empolese",
    'Castelli di Jesi Verdicchio Riserva', 'Colli Bolognesi Pignoletto', "Colli Euganei Fior d'Arancio",
    "Fior d'Arancio Colli Euganei", 'Colli Orientali del Friuli Picolit', "Cortese dell'Alto Monferrato",
    'Custoza',
  ]],
  ['white', IT_E_N, [
    'Erbaluce di Caluso', 'Falanghina del Sannio', 'Fiano di Avellino', 'Gambellara', 'Greco di Bianco',
    'Greco di Tufo', 'Lessini Durello', 'Durello Lessini', 'Loazzolo', 'Locorotondo', 'Lugana',
    'Malvasia delle Lipari', 'Malvasia di Bosa', 'Martina Franca', 'Moscadello di Montalcino',
    'Moscato di Sardegna', 'Moscato di Sorso - Sennori', 'Moscato di Sorso', 'Moscato di Sennori',
    'Moscato di Trani', 'Nasco di Cagliari', 'Nuragus di Cagliari',
  ]],
  ['white', IT_O_Z, [
    'Ortrugo dei Colli Piacentini', 'Ortrugo – Colli Piacentini', 'Pantelleria', 'Ramandolo',
    'Recioto di Gambellara', 'Recioto di Soave', 'Romagna Albana', 'Rosazzo', 'San Martino della Battaglia',
    'Sardegna Semidano', 'Moscato di Terracina', 'Terre di Offida', "Trebbiano d'Abruzzo",
    'Verdicchio dei Castelli di Jesi', 'Verdicchio di Matelica Riserva', 'Verdicchio di Matelica',
    'Vermentino di Gallura', 'Vermentino di Sardegna',
  ]],
]

// ---- Wikidata (CC0): typical grapes (P186 "made from material") and colour of appellation items

const WDQS = 'https://query.wikidata.org/sparql?format=json&query='
const WD_API = 'https://www.wikidata.org/w/api.php?format=json&action=wbgetentities&ids='
const WD_LANGS = ['de', 'en', 'it', 'fr', 'es', 'pt']
// Wine appellations: items with an eAmbrosia ID (P9854), wines (Q282 and subclasses) and items of
// an appellation class (AOC, PDO, DOCG, DO, DOC (PT), wine-producing region, PGI, VDQS, Vinho
// regional, Beaujolais vineyard, Burgundy wine region).
const WD_ITEMS = `{ ?item wdt:P9854 [] } UNION { ?item wdt:P31/wdt:P279* wd:Q282 } UNION {
  VALUES ?cls { wd:Q1565828 wd:Q13439060 wd:Q2305591 wd:Q3139487 wd:Q451752 wd:Q2140699 wd:Q3104453 wd:Q1112254 wd:Q3560266 wd:Q3558198 wd:Q1016093 }
  ?item wdt:P31 ?cls }`
const WD_LANG_FILTER = `FILTER(LANG(?name) IN (${WD_LANGS.map((l) => `"${l}"`).join(', ')}))`

// Colours: P462 "color" values and the wine classes in P31.
const WD_COLOURS = {
  Q3142: 'red', Q3446513: 'red', Q244822: 'red', // red, ruby, garnet
  Q23444: 'white', Q7622361: 'white', Q943: 'white', Q208045: 'white', // white, straw, yellow, gold
  Q429220: 'rose', // pink
}
const WD_WINE_CLASSES = { Q1827: 'red', Q10210: 'white', Q12979: 'rose', Q321263: 'sparkling' }

// Wikidata grape names that are not spelled like an alias in GRAPES (folded → canonical name).
// Only true synonyms or sub-varieties of the same entry; anything else is dropped.
const WD_GRAPE_NAMES = {
  'sauvignon vert': 'Friulano', 'sauvignonasse': 'Friulano',
  'catarratto bianco lucido': 'Catarratto', 'catarratto bianco comune': 'Catarratto', 'catarratto bianco': 'Catarratto',
  'trebbiano toscano': 'Trebbiano', 'trebbiano abruzzese': 'Trebbiano', 'trebbiano romagnolo': 'Trebbiano', 'trebbiano giallo': 'Trebbiano', 'trebbiano modenese': 'Trebbiano', 'trebbiano spoletino': 'Trebbiano', 'procanico': 'Trebbiano',
  'malvasia bianca': 'Malvasia', 'malvasia bianca lunga': 'Malvasia', 'malvasia di candia aromatica': 'Malvasia', 'malvasia bianca di candia': 'Malvasia', 'malvasia istriana': 'Malvasia', 'malvasia del lazio': 'Malvasia', 'malvasia puntinata': 'Malvasia', 'malvasia di candia': 'Malvasia',
  'cesanese comune': 'Cesanese', 'cesanese d affile': 'Cesanese',
  'refosco dal peduncolo rosso': 'Refosco',
  'italian riesling': 'Welschriesling', 'riesling italico': 'Welschriesling',
  'schiava grossa': 'Trollinger', 'schiava gentile': 'Trollinger', 'schiava grigia': 'Trollinger',
  'aglianico del vulture': 'Aglianico', 'corvina veronese': 'Corvina', 'sangiovese grosso': 'Sangiovese',
  'greco bianco': 'Greco', 'tinta del pais': 'Tempranillo', 'tinta fina': 'Tempranillo',
  'muscat blanc a petits grains': 'Muskateller', 'moscato bianco': 'Muskateller', 'muscat of alexandria': 'Muskateller', 'moscato di alessandria': 'Muskateller', 'zibibbo': 'Muskateller',
  'lambrusco marani': 'Lambrusco', 'lambrusco salamino': 'Lambrusco', 'lambrusco di sorbara': 'Lambrusco', 'lambrusco grasparossa': 'Lambrusco', 'lambrusco maestri': 'Lambrusco', 'lambrusco viadanese': 'Lambrusco', 'lambrusco montericco': 'Lambrusco', 'lambrusco oliva': 'Lambrusco', 'lambrusco a foglia frastagliata': 'Lambrusco',
  'garnacha tinta': 'Grenache', 'garnacha blanca': 'Grenache Blanc', 'nero d avola': 'Nero d\'Avola', 'calabrese': 'Nero d\'Avola',
  'turbiana': 'Turbiana', 'trebbiano di lugana': 'Turbiana',
}

const sparql = (key, query) => getJson(key, WDQS + encodeURIComponent(query))

/** wbgetentities in batches of 50; the raw responses are cached under a key that names the ids. */
async function wdEntities(key, ids, props) {
  const out = {}
  const sorted = [...new Set(ids)].sort()
  for (let i = 0; i < sorted.length; i += 50) {
    const batch = sorted.slice(i, i + 50)
    const hash = createHash('sha1').update(batch.join('|') + props).digest('hex').slice(0, 12)
    const j = await getJson(`${key}-${hash}`, `${WD_API}${batch.join('|')}&props=${props}&languages=${WD_LANGS.join('|')}`)
    Object.assign(out, j.entities)
  }
  return out
}

const qid = (uri) => uri.slice(uri.lastIndexOf('/') + 1)
const values = (claims, prop) =>
  (claims?.[prop] ?? []).filter((c) => c.rank !== 'deprecated' && c.mainsnak?.datavalue?.value?.id)

/** "Vin Santo di Montepulciano": the grape name is the town in the appellation's name (GRAPE_PLACES). */
function placeInName(canonical, name) {
  const rule = GRAPE_PLACES.find((p) => p.grape === canonical)
  if (!rule?.before) return false
  const f = fold(name)
  const at = f.indexOf(fold(canonical))
  if (at < 0) return false
  if (rule.keep?.test(f.slice(at + fold(canonical).length))) return false
  return rule.before.test(f.slice(0, at).trimEnd())
}

// "Barolo DOCG", "Chablis (AOC)", "Rioja wine" → "barolo", "chablis", "rioja".
const DESIGNATION = /\s+(docg|doca|docq|doc|dop|do|aoc|aop|ac|igt|igp|ig|pdo|pgi|dac|vqprd|vdqs|wine|wines|vino|vini|vin|vins|vinho|wein|weine|appellation|denominazione di origine controllata( e garantita)?|appellation d origine controlee|appellation d origine protegee|denominacion de origen( calificada)?)$/

function wdNameKey(name) {
  let f = fold(name.replace(/\([^)]*\)/g, ' '))
  for (let prev = ''; prev !== f; ) {
    prev = f
    f = f.replace(DESIGNATION, '').trim()
  }
  return f
}

/**
 * Typical grapes and colours from Wikidata for the appellations in `list` (entries carry `_gi`, the
 * eAmbrosia id). Matching: eAmbrosia id (P9854) first, else an exact label or alias in de/en/it/fr/es/pt
 * after folding and removing designations ("DOCG", "AOC", "wine"), in the same country.
 */
async function wikidataAppellations(list) {
  const meta = await sparql('wikidata-items', `SELECT ?item ?gi ?country WHERE { ${WD_ITEMS}
    OPTIONAL { ?item wdt:P9854 ?gi } OPTIONAL { ?item wdt:P17/wdt:P297 ?country } }`)
  const names = await sparql('wikidata-names', `SELECT ?item ?name WHERE { ${WD_ITEMS}
    { ?item rdfs:label ?name } UNION { ?item skos:altLabel ?name } ${WD_LANG_FILTER} }`)

  const items = new Map() // qid → { gis: Set, countries: Set, names: Set }
  const item = (uri) => {
    const id = qid(uri)
    if (!items.has(id)) items.set(id, { gis: new Set(), countries: new Set(), names: new Set() })
    return items.get(id)
  }
  for (const b of meta.results.bindings) {
    const it = item(b.item.value)
    if (b.gi) it.gis.add(b.gi.value)
    if (b.country) it.countries.add(b.country.value)
  }
  for (const b of names.results.bindings) item(b.item.value).names.add(b.name.value)

  const byGi = new Map()
  const byName = new Map()
  for (const a of list) {
    byGi.set(a._gi, [...(byGi.get(a._gi) ?? []), a])
    const key = fold(a.name)
    byName.set(key, [...(byName.get(key) ?? []), a])
  }

  const matches = new Map() // appellation → Set(qid)
  const stats = { items: items.size, byId: 0, byName: 0 }
  const byIdMatch = new Set() // qid matched by eAmbrosia id
  for (const [id, it] of items) {
    let hit = [...it.gis].flatMap((gi) => byGi.get(gi) ?? [])
    if (hit.length > 0) {
      stats.byId++
      byIdMatch.add(id)
    } else if (it.gis.size > 0) {
      continue // another product with an eAmbrosia id (olive oil "Chianti Classico", cheese, …)
    } else {
      const found = new Set()
      for (const n of it.names) {
        for (const a of byName.get(wdNameKey(n)) ?? []) {
          if (it.countries.size > 0 ? it.countries.has(a.country) : (byName.get(wdNameKey(n)) ?? []).length === 1) found.add(a)
        }
      }
      hit = [...found]
      if (hit.length > 0) stats.byName++
    }
    for (const a of hit) matches.set(a, new Set([...(matches.get(a) ?? []), id]))
  }

  const matchedIds = [...new Set([...matches.values()].flatMap((s) => [...s]))]
  const claims = await wdEntities('wikidata-claims', matchedIds, 'claims')
  const grapeIds = matchedIds.flatMap((id) => values(claims[id]?.claims, 'P186').map((c) => c.mainsnak.datavalue.value.id))
  const grapeItems = await wdEntities('wikidata-grapes', grapeIds, 'labels|aliases')

  const canonicalByName = new Map(GRAPES.flatMap((g) => g.aliases.map((a) => [fold(a), g.canonical])))
  for (const [n, c] of Object.entries(WD_GRAPE_NAMES)) {
    if (!GRAPES.some((g) => g.canonical === c)) throw new Error(`WD_GRAPE_NAMES: ${c} is not in GRAPES`)
    canonicalByName.set(fold(n), c)
  }
  const unmapped = new Map()
  const canonicalOf = (gid) => {
    const e = grapeItems[gid]
    const labels = WD_LANGS.flatMap((l) => (e?.labels?.[l] ? [e.labels[l].value] : []))
    const aliases = WD_LANGS.flatMap((l) => (e?.aliases?.[l] ?? []).map((a) => a.value))
    for (const n of [...labels, ...aliases]) {
      const c = canonicalByName.get(fold(n))
      if (c) return c
    }
    const label = e?.labels?.en?.value ?? labels[0] ?? gid
    unmapped.set(label, (unmapped.get(label) ?? 0) + 1)
    return undefined
  }

  const result = new Map() // appellation → { grapes, colours, items }
  for (const [a, ids] of matches) {
    const grapes = []
    const colours = new Set()
    const idColours = new Set()
    for (const id of [...ids].sort((x, y) => Number(byIdMatch.has(y)) - Number(byIdMatch.has(x)))) {
      const c = claims[id]?.claims
      const made = values(c, 'P186')
        .map((s, i) => ({ id: s.mainsnak.datavalue.value.id, i, share: Number(s.qualifiers?.P1107?.[0]?.datavalue?.value?.amount ?? NaN) }))
        // Larger proportion (P1107) first, otherwise the order of the statements.
        .sort((x, y) => (Number.isNaN(y.share) ? -1 : y.share) - (Number.isNaN(x.share) ? -1 : x.share) || x.i - y.i)
      for (const m of made) {
        const g = canonicalOf(m.id)
        if (g && !grapes.includes(g) && !placeInName(g, a.name)) grapes.push(g)
      }
      const found = [
        ...values(c, 'P462').map((v) => WD_COLOURS[v.mainsnak.datavalue.value.id]),
        ...values(c, 'P31').map((v) => WD_WINE_CLASSES[v.mainsnak.datavalue.value.id]),
      ].filter(Boolean)
      for (const colour of found) {
        colours.add(colour)
        if (byIdMatch.has(id)) idColours.add(colour)
      }
    }
    result.set(a, { grapes, colours, idColours, items: [...ids] })
  }
  return { result, stats, unmapped }
}

// ---- build

const MAX_GRAPES = 5
const GRAPE_COLOUR = new Map(GRAPES.map((g) => [g.canonical, g.colour]))

/** A Wikidata colour as wine type, unless something contradicts it. */
function wikidataType(a, wd) {
  // Only an item that is the appellation (same eAmbrosia id) may set the type, and no other item
  // matched by name may say another colour.
  if (wd.colours.size !== 1 || wd.idColours.size !== 1) return undefined
  // One-word names are often just the town ("Caluso", "Dolceacqua"): rather no type.
  if (!/\s/.test(a.name.trim())) return undefined
  const [type] = wd.colours
  if (a.wineType && a.wineType !== type) return undefined
  // A red appellation made from white grapes (or the other way round) is a data error.
  const grapeColours = new Set(wd.grapes.flatMap((g) => GRAPE_COLOUR.get(g) ?? []))
  if ((type === 'red' || type === 'white') && [...grapeColours].some((c) => c !== type)) return undefined
  // The name says another colour ("… Bianco", "… Rosso").
  const f = fold(a.name)
  const named = /\b(bianco|blanc|blanco|branco|weiss)\b/.test(f) ? 'white' : /\b(rosso|rouge|tinto|rot)\b/.test(f) ? 'red' : /\b(rosato|rose|rosado)\b/.test(f) ? 'rose' : undefined
  if (named && named !== type) return undefined
  return type
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
      seen.set(key, { name, country, ...(wineType ? { wineType } : {}), _gi: g.giIdentifier })
    }
  }
  const list = [...seen.values()].sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name, 'en'))

  // Italian DOPs of one colour (IT_ONE_COLOUR)
  const byKey = new Map(list.map((a) => [`${a.country}|${fold(a.name)}`, a]))
  for (const [type, source, names] of IT_ONE_COLOUR) {
    for (const name of names) {
      const a = byKey.get(`IT|${fold(name)}`)
      if (!a) throw new Error(`IT_ONE_COLOUR: no appellation ${name}`)
      if (a.wineType && a.wineType !== type) throw new Error(`IT_ONE_COLOUR: ${name} is ${a.wineType}`)
      a.wineType = type
      a.sources = [sourceFor(source, a)]
    }
  }

  // Wikidata: typical grapes and, where unambiguous, the colour
  const { result: wd, stats, unmapped } = await wikidataAppellations(list)
  let wdTyped = 0
  for (const a of list) {
    const w = wd.get(a)
    if (!w) continue
    if (w.grapes.length > 0) a.grapes = w.grapes.slice(0, MAX_GRAPES)
    const type = !a.wineType ? wikidataType(a, w) : undefined
    if (type) {
      a.wineType = type
      a._wdType = true
      wdTyped++
    }
  }

  // Verified rules win over everything else
  const unused = []
  for (const rule of VERIFIED) {
    if (rule.mainGrape && rule.grapes[0] !== rule.mainGrape) throw new Error(`${rule.names[0]}: mainGrape must be grapes[0]`)
    for (const g of rule.grapes) if (!GRAPE_COLOUR.has(g)) throw new Error(`${rule.names[0]}: unknown grape ${g}`)
    for (const name of rule.names) {
      const a = byKey.get(`${rule.country}|${fold(name)}`)
      if (!a) {
        unused.push(`${rule.country} ${name}`)
        continue
      }
      a.grapes = rule.grapes
      if (rule.wineType) {
        if (a.wineType && a.wineType !== rule.wineType && !a._wdType) throw new Error(`${name}: type ${a.wineType} vs ${rule.wineType}`)
        a.wineType = rule.wineType
        delete a._wdType
      }
      if (rule.mainGrape) a.mainGrape = rule.mainGrape
      else delete a.mainGrape
      if (rule.source && (rule.mainGrape || rule.wineType)) a.sources = [sourceFor(rule.source, a)]
    }
  }
  if (unused.length > 0) throw new Error(`verified rules without appellation: ${unused.join(', ')}`)

  const typedByWikidata = list.filter((a) => a._wdType)
  // Same key order everywhere: name, country, wineType, grapes, mainGrape, sources
  const out = list.map(({ name, country, wineType, grapes, mainGrape, sources }) =>
    Object.fromEntries(Object.entries({ name, country, wineType, grapes, mainGrape, sources }).filter(([, v]) => v !== undefined)),
  )
  await writeFile(new URL('appellations.json', DATA), JSON.stringify(out))
  const count = (k) => out.filter((a) => a[k]).length
  console.log(`appellations: ${out.length} (from ${wines.length} registered wine GIs)`)
  console.log(`  wikidata: ${stats.items} candidate items, matched ${stats.byId} by eAmbrosia id, ${stats.byName} by name`)
  console.log(`  wineType ${count('wineType')} (${wdTyped} from Wikidata, ${typedByWikidata.length} kept: ${typedByWikidata.map((a) => `${a.name}=${a.wineType} [${wd.get(a).items.join(' ')}]`).join(', ') || '–'})`)
  console.log(`  grapes ${count('grapes')}, mainGrape ${count('mainGrape')}, sources ${count('sources')}`)
  const top = [...unmapped].sort((a, b) => b[1] - a[1]).slice(0, 40)
  console.log(`  Wikidata grapes not in GRAPES (dropped): ${top.map(([n, c]) => `${n} ${c}`).join(', ')}`)
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

if (only !== 'sites') await buildAppellations()
if (only !== 'appellations') await buildSites()
