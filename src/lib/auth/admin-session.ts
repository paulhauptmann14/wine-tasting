import 'server-only'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getSessionSecret } from '@/lib/env'
import { signAdminToken, verifyAdminToken } from './admin-token'

export const ADMIN_TTL_DAYS = 7
const cookieName = (code: string) => `wt_a_${code}`

export async function setAdminCookie(code: string, tastingId: string): Promise<void> {
  const expiresAt = new Date(Date.now() + ADMIN_TTL_DAYS * 86_400_000)
  const store = await cookies()
  store.set(cookieName(code), signAdminToken(tastingId, expiresAt, getSessionSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function isAdmin(tasting: { id: string; code: string }): Promise<boolean> {
  const token = (await cookies()).get(cookieName(tasting.code))?.value
  if (!token) return false
  return verifyAdminToken(token, getSessionSecret())?.tastingId === tasting.id
}

export async function requireAdmin(tasting: { id: string; code: string }): Promise<void> {
  if (!(await isAdmin(tasting))) redirect(`/manage?code=${tasting.code}`)
}
