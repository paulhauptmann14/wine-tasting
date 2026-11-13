import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchWineries, loadWineries, resetWineryCache } from './load'

const ok = (json: unknown) => ({ ok: true, status: 200, json: async () => json })

afterEach(() => {
  vi.unstubAllGlobals()
  resetWineryCache()
})

describe('winery list loader', () => {
  it('fetches the list once and shares the same array', async () => {
    const fetchMock = vi.fn(async () => ok([' Weingut A ', '', 7, 'Weingut B']))
    vi.stubGlobal('fetch', fetchMock)
    const a = await loadWineries()
    const b = await fetchWineries()
    expect(a).toEqual(['Weingut A', 'Weingut B'])
    expect(b).toBe(a)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/data/wineries.json')
  })

  it('stays silent on failure and tries again next time', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 500, json: async () => null })
      .mockRejectedValueOnce(new TypeError('offline'))
      .mockResolvedValueOnce(ok([]))
      .mockResolvedValueOnce(ok(['Weingut A']))
    vi.stubGlobal('fetch', fetchMock)
    expect(await loadWineries()).toEqual([])
    expect(await loadWineries()).toEqual([])
    // An empty list counts as a failure too
    await expect(fetchWineries()).rejects.toThrow()
    expect(await loadWineries()).toEqual(['Weingut A'])
    expect(fetchMock).toHaveBeenCalledTimes(4)
  })
})
