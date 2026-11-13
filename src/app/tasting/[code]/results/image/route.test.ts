import { beforeEach, expect, it, vi } from 'vitest'
import { getTasting } from '@/lib/data'
import { rankingImage } from './ranking-image'
import { GET } from './route'
import { loadResults } from '@/server/results-data'

vi.mock('@/db/client', () => ({ db: {} }))
vi.mock('@/lib/data', () => ({ getTasting: vi.fn() }))
vi.mock('@/server/participants', () => ({ countParticipants: vi.fn(async () => 3) }))
vi.mock('@/server/results-data', () => ({
  loadResults: vi.fn(async () => ({ wines: [], criteria: [] })),
}))
vi.mock('./ranking-image', () => ({
  rankingImage: vi.fn(async (_card: unknown, headers: Record<string, string>) => new Response('png', { headers })),
}))

// Rendered images are kept per process – a different name per test keeps the tests apart
let names = 0
const tasting = (status: string, name = `Weinabend ${++names}`) => ({
  id: 't1',
  code: '8GXBW5',
  name,
  status,
  blindTasting: true,
  scale: 'five',
  createdAt: new Date('2026-11-11T20:00:00Z'),
})

const request = (code = '8GXBW5', headers: HeadersInit = {}, query = '') =>
  GET(new Request(`http://localhost/tasting/${code}/results/image${query}`, { headers }), { params: Promise.resolve({ code }) })

/** Results with `count` rated wines, best first */
const resultsOf = (count: number) => ({
  criteria: [],
  wines: Array.from({ length: count }, (_, i) => ({
    wineId: `w${i + 1}`,
    position: i + 1,
    label: `Wein #${i + 1}`,
    name: `Wein ${i + 1}`,
    score: 5 - i * 0.1,
    rank: i + 1,
    ratingCount: 3,
    criterionAverages: {},
    winery: null,
    wineType: null,
    vintage: null,
    alcohol: null,
    grapeVariety: null,
    sweetness: null,
    description: null,
  })),
})

beforeEach(() => {
  vi.mocked(getTasting).mockReset()
  vi.mocked(rankingImage).mockClear()
  vi.mocked(loadResults).mockClear()
})

it.each([
  ['unknown code', null],
  ['setup', tasting('setup')],
  ['active', tasting('active')],
])('never renders the ranking before the end (%s)', async (_case, found) => {
  vi.mocked(getTasting).mockResolvedValue(found as never)
  const res = await request()
  expect(res.status).toBe(404)
  expect(res.headers.get('cache-control')).toBe('private, no-store')
  expect(rankingImage).not.toHaveBeenCalled()
})

it('renders the finished ranking with names revealed and a download name from the tasting name', async () => {
  vi.mocked(getTasting).mockResolvedValue(tasting('finished', 'Weinabend bei Paul') as never)
  const res = await request()
  expect(res.status).toBe(200)
  expect(res.headers.get('content-type')).toBe('image/png')
  expect(await res.text()).toBe('png')
  expect(res.headers.get('content-disposition')).toBe('inline; filename="weinabend-bei-paul-ergebnis.png"')
  expect(vi.mocked(rankingImage).mock.calls[0][0]).toMatchObject({ title: 'Weinabend bei Paul', footer: '5-Punkte-Skala · 3 Gäste' })
})

it('answers a failed render without caching it', async () => {
  vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
  vi.mocked(rankingImage).mockRejectedValueOnce(new Error('ENOENT'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  const res = await request()
  expect(res.status).toBe(500)
  expect(res.headers.get('cache-control')).toBe('private, no-store')
})

it('lets the browser keep the image, but only after asking whether it changed', async () => {
  vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
  const res = await request()
  // Wines can be edited and the tasting reopened after the end – never use a copy unasked
  expect(res.headers.get('cache-control')).toBe('private, no-cache')
  expect(res.headers.get('etag')).toMatch(/^"[\w-]+"$/)
})

it('answers an unchanged ranking with 304 and does not render it again', async () => {
  vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
  const etag = (await request()).headers.get('etag')!
  vi.mocked(rankingImage).mockClear()

  const res = await request('8GXBW5', { 'If-None-Match': `W/"other", ${etag}` })

  expect(res.status).toBe(304)
  expect(res.body).toBeNull()
  expect(res.headers.get('etag')).toBe(etag)
  expect(res.headers.get('cache-control')).toBe('private, no-cache')
  expect(rankingImage).not.toHaveBeenCalled()
})

it('renders once when many guests open the finished results at the same time', async () => {
  vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
  const responses = await Promise.all([request(), request(), request()])
  expect(responses.map((res) => res.status)).toEqual([200, 200, 200])
  expect(await Promise.all(responses.map((res) => res.text()))).toEqual(['png', 'png', 'png'])
  expect(rankingImage).toHaveBeenCalledOnce()
})

it('renders a new image as soon as the ranking changes', async () => {
  const { countParticipants } = await import('@/server/participants')
  vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
  const before = await request()
  vi.mocked(countParticipants).mockResolvedValueOnce(4)

  const after = await request('8GXBW5', { 'If-None-Match': before.headers.get('etag')! })

  expect(after.status).toBe(200)
  expect(after.headers.get('etag')).not.toBe(before.headers.get('etag'))
  expect(rankingImage).toHaveBeenCalledTimes(2)
})

it('tries again after a failed render', async () => {
  vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
  vi.mocked(rankingImage).mockRejectedValueOnce(new Error('ENOENT'))
  vi.spyOn(console, 'error').mockImplementation(() => {})
  expect((await request()).status).toBe(500)
  expect((await request()).status).toBe(200)
  expect(rankingImage).toHaveBeenCalledTimes(2)
})

it('serves image 2 with its own file name', async () => {
  vi.mocked(getTasting).mockResolvedValue(tasting('finished', 'Weinabend bei Paul') as never)
  vi.mocked(loadResults).mockResolvedValue(resultsOf(13) as never)
  const first = await request('8GXBW5', {}, '?bild=1')
  const second = await request('8GXBW5', {}, '?bild=2')
  expect(second.status).toBe(200)
  expect(second.headers.get('content-disposition')).toMatch(/-ergebnis-2\.png"$/)
  expect(first.headers.get('content-disposition')).toMatch(/-ergebnis-1\.png"$/)
  expect(second.headers.get('etag')).not.toBe(first.headers.get('etag'))
  expect(vi.mocked(rankingImage).mock.calls[1][0]).toMatchObject({ kind: 'rows', page: 2, footer: expect.stringMatching(/^Bild 2 von 2 · /) })
})

it('keeps the old address for image 1', async () => {
  vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
  vi.mocked(loadResults).mockResolvedValue(resultsOf(13) as never)
  const plain = await request()
  const first = await request('8GXBW5', {}, '?bild=1')
  expect(plain.headers.get('etag')).toBe(first.headers.get('etag'))
})

it.each(['?bild=0', '?bild=01', '?bild=abc', '?bild=3', '?bild=', '?bild=1000'])(
  'answers unknown images (%s) with 404 without rendering',
  async (query) => {
    vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
    vi.mocked(loadResults).mockResolvedValue(resultsOf(13) as never)
    const res = await request('8GXBW5', {}, query)
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(rankingImage).not.toHaveBeenCalled()
  },
)

it.each(['?bild=0', '?bild=01', '?bild=abc', '?bild=', '?bild=1000', '?bild=-1'])(
  'answers a malformed image number (%s) before loading the results',
  async (query) => {
    vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
    const res = await request('8GXBW5', {}, query)
    expect(res.status).toBe(404)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(loadResults).not.toHaveBeenCalled()
  },
)
