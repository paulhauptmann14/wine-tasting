import { beforeEach, expect, it, vi } from 'vitest'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { requireTasting } from '@/lib/data'
import { saveRating } from '@/server/ratings'
import { getWineById } from '@/server/wines'
import { saveRatingAction } from './actions'

// Like the real ones, redirect() and notFound() end the action
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`)
  }),
  notFound: vi.fn(() => {
    throw new Error('notFound')
  }),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/db/client', () => ({ db: {} }))
vi.mock('@/lib/data', () => ({ requireTasting: vi.fn() }))
vi.mock('@/lib/auth/participant-session', () => ({ getCurrentParticipant: vi.fn(), setParticipantCookie: vi.fn() }))
vi.mock('@/server/criteria', () => ({ listCriteria: vi.fn(async () => [{ id: 'c1', scaleMin: 1, scaleMax: 5 }]) }))
vi.mock('@/server/ratings', () => ({ saveRating: vi.fn() }))
vi.mock('@/server/wines', () => ({ getWineById: vi.fn(), countWines: vi.fn(async () => 2) }))

const WINE_ID = '11111111-1111-4111-8111-111111111111'
const tasting = (status: string) => ({ id: 't1', code: '8GXBW5', status, blindTasting: false })
const form = () => {
  const fd = new FormData()
  fd.set('c_c1', '4')
  return fd
}
// shownPosition = the number the guest saw when the page was rendered
const save = (wineId = WINE_ID, shownPosition: unknown = 1) =>
  saveRatingAction('8GXBW5', wineId, shownPosition, undefined, form())

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireTasting).mockResolvedValue(tasting('active') as never)
  vi.mocked(getCurrentParticipant).mockResolvedValue({ id: 'p1', name: 'Anna' })
  vi.mocked(getWineById).mockResolvedValue({ id: WINE_ID, position: 1 } as never)
})

it('saves and moves on to the next wine', async () => {
  await expect(save()).rejects.toThrow('redirect:/tasting/8GXBW5/wine/2?saved=1')
  expect(saveRating).toHaveBeenCalledWith({}, { participantId: 'p1', wineId: WINE_ID, values: { c1: 4 }, notes: null })
})

it('sends visitors without a seat back to joining', async () => {
  vi.mocked(getCurrentParticipant).mockResolvedValue(null)
  await expect(save()).rejects.toThrow('redirect:/tasting/8GXBW5')
  expect(saveRating).not.toHaveBeenCalled()
})

it('refuses ratings before the start and after the end', async () => {
  vi.mocked(requireTasting).mockResolvedValue(tasting('setup') as never)
  expect(await save()).toEqual({ message: 'Das Tasting hat noch nicht begonnen.' })
  vi.mocked(requireTasting).mockResolvedValue(tasting('finished') as never)
  await expect(save()).rejects.toThrow('redirect:/tasting/8GXBW5/results')
  expect(saveRating).not.toHaveBeenCalled()
})

it('refuses when the wine got another number since the page was opened (shuffled or moved)', async () => {
  // The guest looks at "Wein #2" – meanwhile that wine moved to #4, so the glass in front of them is another wine
  vi.mocked(getWineById).mockResolvedValue({ id: WINE_ID, position: 4 } as never)
  const result = await save(WINE_ID, 2)
  expect(result).toMatchObject({ reload: true })
  expect(result?.message).toMatch(/Reihenfolge.*geändert.*Wein #2/)
  expect(saveRating).not.toHaveBeenCalled()
})

it('treats a tampered position like a changed order', async () => {
  for (const bad of ['2', 0, 1.5, null]) {
    expect(await save(WINE_ID, bad)).toMatchObject({ reload: true })
  }
  expect(saveRating).not.toHaveBeenCalled()
})

it('refuses wines of other tastings and malformed ids', async () => {
  vi.mocked(getWineById).mockResolvedValue(null)
  expect(await save()).toEqual({ message: 'Diesen Wein gibt es nicht mehr.' })
  expect(await save('not-a-uuid')).toEqual({ message: 'Diesen Wein gibt es nicht mehr.' })
  expect(getWineById).toHaveBeenCalledTimes(1)
  expect(saveRating).not.toHaveBeenCalled()
})
