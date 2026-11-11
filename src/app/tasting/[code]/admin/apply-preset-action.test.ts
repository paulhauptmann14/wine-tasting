import { beforeEach, expect, it, vi } from 'vitest'
import { getAdminTasting } from '@/lib/data'
import { applyPreset } from '@/server/criteria'
import { StructureLockedError } from '@/server/structure'
import { revalidatePath } from 'next/cache'
import { applyPresetAction } from './actions'

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/db/client', () => ({ db: {} }))
vi.mock('@/lib/data', () => ({ getAdminTasting: vi.fn() }))
vi.mock('@/lib/auth/admin-session', () => ({ clearAdminCookie: vi.fn() }))
vi.mock('@/lib/auth/participant-session', () => ({ clearParticipantCookie: vi.fn() }))
vi.mock('@/server/criteria', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/server/criteria')>()),
  applyPreset: vi.fn(),
}))

const tasting = { id: 't1', code: '8GXBW5', status: 'setup' }
const form = (preset?: string) => {
  const fd = new FormData()
  if (preset !== undefined) fd.set('preset', preset)
  return fd
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(getAdminTasting).mockResolvedValue(tasting as never)
  vi.mocked(applyPreset).mockResolvedValue({ ok: true })
})

it('checks admin access first, applies the preset and refreshes', async () => {
  expect(await applyPresetAction('8GXBW5', undefined, form('hundred'))).toEqual({ ok: true })
  expect(getAdminTasting).toHaveBeenCalledWith('8GXBW5')
  expect(applyPreset).toHaveBeenCalledWith({}, 't1', 'hundred')
  expect(revalidatePath).toHaveBeenCalledWith('/tasting/8GXBW5', 'layout')
})

it('does nothing without admin access', async () => {
  vi.mocked(getAdminTasting).mockRejectedValue(new Error('redirect'))
  await expect(applyPresetAction('8GXBW5', undefined, form('hundred'))).rejects.toThrow('redirect')
  expect(applyPreset).not.toHaveBeenCalled()
})

it('rejects unknown or missing presets', async () => {
  for (const fd of [form('platinum'), form(), form('')]) {
    const result = await applyPresetAction('8GXBW5', undefined, fd)
    expect(result?.ok).toBeUndefined()
    expect(result?.message).toBeTruthy()
  }
  expect(applyPreset).not.toHaveBeenCalled()
})

it('passes on the refusal when ratings exist', async () => {
  vi.mocked(applyPreset).mockResolvedValue({ ok: false, reason: 'Es gibt schon Bewertungen.' })
  expect(await applyPresetAction('8GXBW5', undefined, form('twenty'))).toEqual({ message: 'Es gibt schon Bewertungen.' })
  expect(revalidatePath).not.toHaveBeenCalled()
})

it('explains the lock when the tasting already runs', async () => {
  vi.mocked(applyPreset).mockRejectedValue(new StructureLockedError())
  expect(await applyPresetAction('8GXBW5', undefined, form('twenty'))).toEqual({
    message: 'Das Bewertungssystem lässt sich nur in der Vorbereitung ändern.',
  })
})

it('passes other errors on', async () => {
  vi.mocked(applyPreset).mockRejectedValue(new Error('db down'))
  await expect(applyPresetAction('8GXBW5', undefined, form('twenty'))).rejects.toThrow('db down')
})
