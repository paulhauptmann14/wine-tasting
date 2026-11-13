import { beforeEach, expect, it, vi } from 'vitest'
import { revalidatePath } from 'next/cache'
import { getCurrentParticipant, setParticipantCookie } from '@/lib/auth/participant-session'
import { requireTasting } from '@/lib/data'
import { rejoinTasting } from '@/server/participants'
import { saveGuestRating } from '@/server/ratings'
import { getWineById } from '@/server/wines'
import { rejoinAction, saveRatingAction } from './actions'

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
vi.mock('@/server/criteria', () => ({ listCriteria: vi.fn(async () => [{ id: 'c1', name: 'Geschmack', scaleMin: 1, scaleMax: 5 }]) }))
vi.mock('@/lib/env', () => ({ getSessionSecret: () => 'secret' }))
vi.mock('@/server/participants', () => ({ joinTasting: vi.fn(), rejoinTasting: vi.fn() }))
vi.mock('@/server/ratings', () => ({ saveGuestRating: vi.fn() }))
vi.mock('@/server/wines', () => ({ countWines: vi.fn(async () => 2), getWineById: vi.fn() }))

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

const PAUSED = {
  message: 'Der Gastgeber hat kurz angehalten. Deine Sterne stehen noch hier – speicher gleich nochmal.',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireTasting).mockResolvedValue(tasting('active') as never)
  vi.mocked(getCurrentParticipant).mockResolvedValue({ id: 'p1', name: 'Anna' })
  vi.mocked(saveGuestRating).mockResolvedValue({ ok: true, position: 1 })
  vi.mocked(getWineById).mockResolvedValue({ id: WINE_ID, position: 1 } as never)
})

it('saves and moves on to the next wine', async () => {
  await expect(save()).rejects.toThrow('redirect:/tasting/8GXBW5/wine/2?saved=1')
  expect(saveGuestRating).toHaveBeenCalledWith({}, {
    tastingId: 't1',
    participantId: 'p1',
    wineId: WINE_ID,
    shownPosition: 1,
    values: { c1: 4 },
    notes: null,
  })
})

it('moves on from the number the wine has when saved', async () => {
  vi.mocked(getWineById).mockResolvedValue({ id: WINE_ID, position: 2 } as never)
  vi.mocked(saveGuestRating).mockResolvedValue({ ok: true, position: 2 })
  await expect(save(WINE_ID, 2)).rejects.toThrow('redirect:/tasting/8GXBW5?saved=2')
})

it('sends visitors without a seat back to joining', async () => {
  vi.mocked(getCurrentParticipant).mockResolvedValue(null)
  await expect(save()).rejects.toThrow('redirect:/tasting/8GXBW5')
  expect(saveGuestRating).not.toHaveBeenCalled()
})

it('keeps the guest calm when the host paused the tasting, and sends them to the results once it ended', async () => {
  vi.mocked(requireTasting).mockResolvedValue(tasting('setup') as never)
  expect(await save()).toEqual(PAUSED)
  vi.mocked(requireTasting).mockResolvedValue(tasting('finished') as never)
  // ?ended=1 lets the results page explain the jump
  await expect(save()).rejects.toThrow('redirect:/tasting/8GXBW5/results?ended=1')
  expect(saveGuestRating).not.toHaveBeenCalled()
})

it('names the criteria without stars', async () => {
  const fd = new FormData()
  fd.set('c_c1', '')
  const result = await saveRatingAction('8GXBW5', WINE_ID, 1, undefined, fd)
  expect(result?.message).toBe('Bei Geschmack fehlen noch Sterne.')
  expect(result?.fieldErrors).toHaveProperty('c_c1')
  expect(saveGuestRating).not.toHaveBeenCalled()
})

it('gives the same answers when the status changed only while saving', async () => {
  // The lookup still said 'active' – the transaction in saveGuestRating has the last word
  vi.mocked(saveGuestRating).mockResolvedValueOnce({ ok: false, reason: 'paused' })
  expect(await save()).toEqual(PAUSED)
  vi.mocked(saveGuestRating).mockResolvedValueOnce({ ok: false, reason: 'finished' })
  await expect(save()).rejects.toThrow('redirect:/tasting/8GXBW5/results?ended=1')
  expect(revalidatePath).not.toHaveBeenCalled()
})

it('refuses when the wine got another number since the page was opened (shuffled or moved)', async () => {
  // The guest looks at "Wein #2" – meanwhile that wine moved to #4, so the glass in front of them is another wine
  vi.mocked(getWineById).mockResolvedValue({ id: WINE_ID, position: 4 } as never)
  const result = await save(WINE_ID, 2)
  expect(result).toMatchObject({ reload: true })
  expect(result?.message).toMatch(/Reihenfolge.*geändert.*Wein #2/)
  expect(saveGuestRating).not.toHaveBeenCalled()
  // Moved only while saving: the transaction says so with the same answer
  vi.mocked(getWineById).mockResolvedValue({ id: WINE_ID, position: 2 } as never)
  vi.mocked(saveGuestRating).mockResolvedValue({ ok: false, reason: 'moved' })
  expect(await save(WINE_ID, 2)).toMatchObject({ reload: true })
  expect(revalidatePath).not.toHaveBeenCalled()
})

it('reports a moved or deleted wine before missing stars, so the guest does not fix stars in vain', async () => {
  const fd = new FormData()
  fd.set('c_c1', '')
  vi.mocked(getWineById).mockResolvedValue({ id: WINE_ID, position: 3 } as never)
  expect(await saveRatingAction('8GXBW5', WINE_ID, 1, undefined, fd)).toMatchObject({ reload: true })
  vi.mocked(getWineById).mockResolvedValue(null)
  expect(await saveRatingAction('8GXBW5', WINE_ID, 1, undefined, fd)).toEqual({ message: 'Diesen Wein gibt es nicht mehr.' })
})

it('treats a tampered position like a changed order', async () => {
  for (const bad of ['2', 0, 1.5, null]) {
    expect(await save(WINE_ID, bad)).toMatchObject({ reload: true })
  }
  expect(saveGuestRating).not.toHaveBeenCalled()
})

it('refuses wines of other tastings and malformed ids', async () => {
  vi.mocked(getWineById).mockResolvedValue(null)
  expect(await save()).toEqual({ message: 'Diesen Wein gibt es nicht mehr.' })
  expect(await save('not-a-uuid')).toEqual({ message: 'Diesen Wein gibt es nicht mehr.' })
  // Deleted only while saving
  vi.mocked(getWineById).mockResolvedValue({ id: WINE_ID, position: 1 } as never)
  vi.mocked(saveGuestRating).mockResolvedValue({ ok: false, reason: 'wine_gone' })
  expect(await save()).toEqual({ message: 'Diesen Wein gibt es nicht mehr.' })
  expect(saveGuestRating).toHaveBeenCalledTimes(1)
})

const LINK = `${WINE_ID}.abcdefghijklmnopqrstuv`
const rejoin = (link: unknown = LINK) => rejoinAction('8gxbw5', link)
const EXPIRES = new Date('2026-12-01T00:00:00Z')

it('signs this device in as the guest of the rejoin link', async () => {
  vi.mocked(rejoinTasting).mockResolvedValue({ participant: { id: 'p1', name: 'Anna' }, token: 'tok', expiresAt: EXPIRES })
  await expect(rejoin()).rejects.toThrow('redirect:/tasting/8GXBW5')
  expect(rejoinTasting).toHaveBeenCalledWith({}, 't1', LINK, 'secret')
  expect(setParticipantCookie).toHaveBeenCalledWith('8GXBW5', 'tok', EXPIRES)
  expect(revalidatePath).toHaveBeenCalledWith('/tasting/8GXBW5', 'layout')
})

it('refuses locked, foreign or tampered rejoin links without signing in', async () => {
  vi.mocked(rejoinTasting).mockResolvedValue(null)
  const message = { message: 'Dieser Link gilt nicht mehr. Frag den Gastgeber nach einem neuen.' }
  expect(await rejoin()).toEqual(message)
  // Bound arguments come from the client: anything but a short string never reaches the service
  for (const bad of [null, 42, { id: 'p1' }, 'x'.repeat(101)]) expect(await rejoin(bad)).toEqual(message)
  expect(rejoinTasting).toHaveBeenCalledTimes(1)
  expect(setParticipantCookie).not.toHaveBeenCalled()
})

it('sends rejoining guests of a finished tasting to the results', async () => {
  vi.mocked(requireTasting).mockResolvedValue(tasting('finished') as never)
  await expect(rejoin()).rejects.toThrow('redirect:/tasting/8GXBW5/results')
  expect(rejoinTasting).not.toHaveBeenCalled()
  expect(setParticipantCookie).not.toHaveBeenCalled()
})
