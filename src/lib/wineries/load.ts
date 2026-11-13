import { parseWineries } from '@/lib/label/reference-data'

/**
 * Client loader for the self-hosted winery list (`public/data/wineries.json`, names only). The winery
 * field and the label scan share it, so the file is fetched, checked and held in memory once per page
 * load – and the search index in match.ts, cached per array, is built once too.
 */

const WINERIES_URL = '/data/wineries.json'

let loading: Promise<string[]> | null = null

/** Rejects if the file can't be loaded or holds no names; the next call then tries again. */
export function fetchWineries(): Promise<string[]> {
  loading ??= fetch(WINERIES_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`${WINERIES_URL}: ${res.status}`)
      return res.json() as Promise<unknown>
    })
    .then((data) => {
      const names = parseWineries(data)
      if (names.length === 0) throw new Error(`${WINERIES_URL}: no names`)
      return names
    })
    .catch((error: unknown) => {
      loading = null
      throw error
    })
  return loading
}

/** Like fetchWineries, but a failure is silent: an empty list (free text still works). */
export function loadWineries(): Promise<string[]> {
  return fetchWineries().catch(() => [])
}

/** For tests. */
export function resetWineryCache() {
  loading = null
}
