import { revalidatePath } from 'next/cache'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAdminTasting } from '@/lib/data'
import { SHUFFLE_TOO_FEW_HINT } from '@/lib/tasting/rules'
import { StructureLockedError } from '@/server/structure'
import { setBlindTasting } from '@/server/tastings'
import { shuffleWines } from '@/server/wines'
import { shuffleWinesAction, updateBlindTastingAction } from './actions'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/db/client', () => ({ db: {} }))
vi.mock('@/lib/data', () => ({ getAdminTasting: vi.fn() }))
vi.mock('@/lib/auth/admin-session', () => ({ clearAdminCookie: vi.fn() }))
vi.mock('@/lib/auth/participant-session', () => ({ clearParticipantCookie: vi.fn() }))
vi.mock('@/server/tastings', () => ({ setBlindTasting: vi.fn() }))
vi.mock('@/server/wines', () => ({ shuffleWines: vi.fn() }))

const tasting = { id: 't1', code: '8GXBW5', status: 'setup', blindTasting: true }

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAdminTasting).mockResolvedValue(tasting as never)
})

it('switches blind mode', async () => {
  expect(await updateBlindTastingAction('8GXBW5', false)).toEqual({ ok: true })
  expect(setBlindTasting).toHaveBeenCalledWith({}, 't1', false)
})

it('explains the lock when the service refuses (tasting already runs)', async () => {
  vi.mocked(setBlindTasting).mockRejectedValue(new StructureLockedError())
  expect(await updateBlindTastingAction('8GXBW5', false)).toEqual({ message: 'Lässt sich nur in der Vorbereitung ändern.' })
})

it('passes other errors on', async () => {
  vi.mocked(setBlindTasting).mockRejectedValue(new Error('db down'))
  await expect(updateBlindTastingAction('8GXBW5', false)).rejects.toThrow('db down')
})

it('rejects anything but a boolean', async () => {
  expect((await updateBlindTastingAction('8GXBW5', 'false'))?.message).toMatch(/Ungültige Anfrage/)
  expect(setBlindTasting).not.toHaveBeenCalled()
})

describe('shuffleWinesAction', () => {
  it('checks admin access first and does not touch wines when it fails', async () => {
    vi.mocked(getAdminTasting).mockRejectedValue(new Error('redirect'))
    await expect(shuffleWinesAction('8GXBW5')).rejects.toThrow('redirect')
    expect(shuffleWines).not.toHaveBeenCalled()
  })

  it('names the new order and refreshes the pages', async () => {
    vi.mocked(shuffleWines).mockResolvedValue({ ok: true, shuffled: 3, order: ['Primitivo', 'Riesling', 'Merlot'] })
    expect(await shuffleWinesAction('8GXBW5')).toMatchObject({
      ok: true,
      message: 'Neu: 1 Primitivo, 2 Riesling, 3 Merlot',
    })
    expect(shuffleWines).toHaveBeenCalledWith({}, 't1')
    expect(revalidatePath).toHaveBeenCalledWith('/tasting/8GXBW5', 'layout')
  })

  it('says why nothing happened when fewer than two wines are unrated', async () => {
    vi.mocked(shuffleWines).mockResolvedValue({ ok: true, shuffled: 0, order: [] })
    expect(await shuffleWinesAction('8GXBW5')).toMatchObject({ message: SHUFFLE_TOO_FEW_HINT })
    expect(revalidatePath).toHaveBeenCalledWith('/tasting/8GXBW5', 'layout')
  })

  it('passes on the reason when the service refuses', async () => {
    vi.mocked(shuffleWines).mockResolvedValue({ ok: false, reason: 'Das Tasting ist beendet.' })
    expect(await shuffleWinesAction('8GXBW5')).toMatchObject({ message: 'Das Tasting ist beendet.' })
    expect(revalidatePath).not.toHaveBeenCalled()
  })
})
