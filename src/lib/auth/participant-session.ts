import 'server-only'
import { cookies } from 'next/headers'
import { db } from '@/db/client'
import { getParticipantBySessionToken } from '@/server/participants'

const cookieName = (code: string) => `wt_p_${code}`

export async function setParticipantCookie(code: string, token: string, expiresAt: Date): Promise<void> {
  const store = await cookies()
  store.set(cookieName(code), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  })
}

export async function getCurrentParticipant(tasting: { id: string; code: string }) {
  const token = (await cookies()).get(cookieName(tasting.code))?.value
  if (!token) return null
  return getParticipantBySessionToken(db, tasting.id, token)
}

export async function clearParticipantCookie(code: string): Promise<void> {
  ;(await cookies()).delete(cookieName(code))
}
