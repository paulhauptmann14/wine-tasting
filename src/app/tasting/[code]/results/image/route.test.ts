import { beforeEach, expect, it, vi } from 'vitest'
import { getTasting } from '@/lib/data'
import { rankingImage } from './ranking-image'
import { GET } from './route'

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

const request = (code = '8GXBW5', headers: HeadersInit = {}) =>
  GET(new Request(`http://localhost/tasting/${code}/results/image`, { headers }), { params: Promise.resolve({ code }) })

beforeEach(() => {
  vi.mocked(getTasting).mockReset()
  vi.mocked(rankingImage).mockClear()
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
