import { beforeEach, expect, it, vi } from 'vitest'
import { getAdminTasting } from '@/lib/data'
import { StructureLockedError } from '@/server/structure'
import { setBlindTasting } from '@/server/tastings'
import { updateBlindTastingAction } from './actions'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/db/client', () => ({ db: {} }))
vi.mock('@/lib/data', () => ({ getAdminTasting: vi.fn() }))
vi.mock('@/lib/auth/admin-session', () => ({ clearAdminCookie: vi.fn() }))
vi.mock('@/lib/auth/participant-session', () => ({ clearParticipantCookie: vi.fn() }))
vi.mock('@/server/tastings', () => ({ setBlindTasting: vi.fn() }))

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
