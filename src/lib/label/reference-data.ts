// Types and tolerant parsers for the reference lists in public/data (built by
// scripts/build-wineries.mjs and scripts/build-reference-data.mjs, loaded lazily by the client).
// Pure and browser-safe. Broken entries are dropped instead of throwing: a missing list only means
// fewer suggestions.

import { WINE_TYPE_KEYS, type WineType } from '@/lib/tasting/wine-type'

/**
 * EU wine PDO/PGI (eAmbrosia). `wineType` only where the appellation allows exactly one colour.
 * `grapes`: typical grapes, most important first, canonical names of GRAPES in dictionaries.ts.
 * `mainGrape`: only where the rules require ≥ 85 % of one grape (verified at `sources`); always
 * `grapes[0]`.
 */
export type Appellation = {
  name: string
  country: string
  wineType?: WineType
  grapes?: string[]
  mainGrape?: string
  sources?: string[]
}
/** Official vineyard site (Einzellage, Ried, Vigna) with its village and wine region. */
export type Site = { name: string; village?: string; region: string }

export type ReferenceData = { wineries: string[]; appellations: Appellation[]; sites: Site[] }

export const EMPTY_REFERENCE_DATA: ReferenceData = { wineries: [], appellations: [], sites: [] }

const text = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null)
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

export function parseWineries(json: unknown): string[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((v) => text(v) ?? [])
}

export function parseAppellations(json: unknown): Appellation[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((v): Appellation[] => {
    if (!isRecord(v)) return []
    const name = text(v.name)
    const country = text(v.country)
    if (!name || !country) return []
    const out: Appellation = { name, country }
    const wineType = WINE_TYPE_KEYS.find((k) => k === v.wineType)
    if (wineType) out.wineType = wineType
    const mainGrape = text(v.mainGrape)
    const listed = textList(v.grapes)
    const grapes = listed.length > 0 ? listed : mainGrape ? [mainGrape] : []
    if (grapes.length > 0) out.grapes = grapes
    // A main grape that is not the first typical grape is a data error: rather none.
    if (mainGrape && grapes[0] === mainGrape) out.mainGrape = mainGrape
    const sources = textList(v.sources)
    if (sources.length > 0) out.sources = sources
    return [out]
  })
}

/** Distinct non-empty strings of an array, in order; anything else gives an empty list. */
function textList(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.flatMap((x) => text(x) ?? []))]
}

export function parseSites(json: unknown): Site[] {
  if (!Array.isArray(json)) return []
  return json.flatMap((v): Site[] => {
    if (!isRecord(v)) return []
    const name = text(v.name)
    const region = text(v.region)
    if (!name || !region) return []
    const village = text(v.village)
    return [village ? { name, village, region } : { name, region }]
  })
}
