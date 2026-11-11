import { beforeEach, expect, it, vi } from 'vitest'
import { isAdmin, requireAdmin } from './admin-session'
import { signAdminToken } from './admin-token'

const jar = new Map<string, string>()
vi.mock('server-only', () => ({}))
vi.mock('next/headers', () => ({
  cookies: async () => ({ get: (name: string) => (jar.has(name) ? { value: jar.get(name) } : undefined) }),
}))
vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`)
  }),
}))

const SECRET = 'test-secret-with-at-least-32-characters!'
const tasting = { id: '11111111-1111-4111-8111-111111111111', code: '8GXBW5' }
const tokenFor = (tastingId: string) => signAdminToken(tastingId, new Date(Date.now() + 60_000), SECRET)

beforeEach(() => {
  jar.clear()
  vi.stubEnv('SESSION_SECRET', SECRET)
})

it('accepts a token for this tasting under its cookie', async () => {
  jar.set(`wt_a_${tasting.code}`, tokenFor(tasting.id))
  expect(await isAdmin(tasting)).toBe(true)
})

it('rejects a valid token of another tasting placed under this cookie', async () => {
  jar.set(`wt_a_${tasting.code}`, tokenFor('22222222-2222-4222-8222-222222222222'))
  expect(await isAdmin(tasting)).toBe(false)
})

it('rejects a missing cookie and a token stored under another code', async () => {
  expect(await isAdmin(tasting)).toBe(false)
  jar.set('wt_a_OTHER1', tokenFor(tasting.id))
  expect(await isAdmin(tasting)).toBe(false)
})

it('sends non-admins to the PIN login for this code', async () => {
  await expect(requireAdmin(tasting)).rejects.toThrow(`redirect:/manage?code=${tasting.code}`)
})
