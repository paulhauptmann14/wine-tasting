import { beforeEach, expect, it, vi } from 'vitest'
import { getAdminTasting } from '@/lib/data'
import { setBlindTasting } from '@/server/tastings'
import { updateBlindTastingAction } from './actions'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/db/client', () => ({ db: {} }))
vi.mock('@/lib/data', () => ({ getAdminTasting: vi.fn() }))
vi.mock('@/lib/auth/admin-session', () => ({ clearAdminCookie: vi.fn() }))
vi.mock('@/lib/auth/participant-session', () => ({ clearParticipantCookie: vi.fn() }))
vi.mock('@/server/tastings', () => ({ setBlindTasting: vi.fn() }))

const tasting = (status: string) => ({ id: 't1', code: '8GXBW5', status, blindTasting: true })

beforeEach(() => vi.clearAllMocks())

it('switches blind mode during setup', async () => {
  vi.mocked(getAdminTasting).mockResolvedValue(tasting('setup') as never)
  expect(await updateBlindTastingAction('8GXBW5', false)).toEqual({ ok: true })
  expect(setBlindTasting).toHaveBeenCalledWith({}, 't1', false)
})

it('keeps blind names hidden once the tasting runs', async () => {
  vi.mocked(getAdminTasting).mockResolvedValue(tasting('active') as never)
  expect(await updateBlindTastingAction('8GXBW5', false)).toEqual({ message: 'Lässt sich nur in der Vorbereitung ändern.' })
  expect(setBlindTasting).not.toHaveBeenCalled()
})

it('rejects anything but a boolean', async () => {
  vi.mocked(getAdminTasting).mockResolvedValue(tasting('setup') as never)
  expect((await updateBlindTastingAction('8GXBW5', 'false'))?.message).toMatch(/Ungültige Anfrage/)
  expect(setBlindTasting).not.toHaveBeenCalled()
})
