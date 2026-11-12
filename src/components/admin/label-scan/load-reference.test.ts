import { afterEach, describe, expect, it, vi } from 'vitest'
import { loadReference, resetReferenceCache } from './load-reference'

const files: Record<string, unknown> = {
  '/data/wineries.json': ['Weingut A'],
  '/data/appellations.json': [{ name: 'Barolo', country: 'IT', wineType: 'red' }],
  '/data/sites.json': [{ name: 'Kupp', village: 'Serrig', region: 'Mosel' }],
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetReferenceCache()
})

describe('loadReference', () => {
  it('fetches all three files once and caches the result', async () => {
    const fetchMock = vi.fn(async (url: string) => ({ ok: true, status: 200, json: async () => files[url] }))
    vi.stubGlobal('fetch', fetchMock)
    const a = await loadReference()
    const b = await loadReference()
    expect(a).toEqual({
      wineries: ['Weingut A'],
      appellations: [{ name: 'Barolo', country: 'IT', wineType: 'red' }],
      sites: [{ name: 'Kupp', village: 'Serrig', region: 'Mosel' }],
    })
    expect(b).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('returns an empty list for a failed file and retries it next time', async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === '/data/sites.json' ? { ok: false, status: 500, json: async () => null } : { ok: true, status: 200, json: async () => files[url] },
    )
    vi.stubGlobal('fetch', fetchMock)
    const a = await loadReference()
    expect(a.sites).toEqual([])
    expect(a.wineries).toEqual(['Weingut A'])
    await loadReference()
    expect(fetchMock).toHaveBeenCalledTimes(6)
  })
})
