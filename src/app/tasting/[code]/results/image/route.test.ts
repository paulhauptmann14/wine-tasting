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

const tasting = (status: string) => ({
  id: 't1',
  code: '8GXBW5',
  name: 'Weinabend bei Paul',
  status,
  blindTasting: true,
  scale: 'five',
  createdAt: new Date('2026-11-11T20:00:00Z'),
})

const request = (code = '8GXBW5') =>
  GET(new Request(`http://localhost/tasting/${code}/results/image`), { params: Promise.resolve({ code }) })

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
  vi.mocked(getTasting).mockResolvedValue(tasting('finished') as never)
  const res = await request()
  expect(res.status).toBe(200)
  expect(res.headers.get('cache-control')).toBe('private, no-store')
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
