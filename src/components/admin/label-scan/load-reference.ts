import {
  EMPTY_REFERENCE_DATA,
  parseAppellations,
  parseSites,
  parseWineries,
  type ReferenceData,
} from '@/lib/label/reference-data'

/**
 * Client loader for the reference lists in `public/data` (winery names, EU appellations, vineyard
 * sites). The three files are fetched in parallel once and cached in module scope. A failed file
 * only means an empty list (fewer suggestions) and is retried on the next call.
 */

let cache: Promise<ReferenceData> | null = null

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return res.json()
}

export function loadReference(): Promise<ReferenceData> {
  cache ??= Promise.allSettled([
    fetchJson('/data/wineries.json'),
    fetchJson('/data/appellations.json'),
    fetchJson('/data/sites.json'),
  ]).then(([w, a, s]) => {
    const data: ReferenceData = {
      wineries: w.status === 'fulfilled' ? parseWineries(w.value) : EMPTY_REFERENCE_DATA.wineries,
      appellations: a.status === 'fulfilled' ? parseAppellations(a.value) : EMPTY_REFERENCE_DATA.appellations,
      sites: s.status === 'fulfilled' ? parseSites(s.value) : EMPTY_REFERENCE_DATA.sites,
    }
    // Do not keep a partly failed result: the next scan tries again
    if ([w, a, s].some((r) => r.status === 'rejected')) cache = null
    return data
  })
  return cache
}

/** For tests. */
export function resetReferenceCache() {
  cache = null
}
