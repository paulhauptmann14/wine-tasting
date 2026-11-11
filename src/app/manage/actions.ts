'use server'

import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { setAdminCookie } from '@/lib/auth/admin-session'
import { formatWait } from '@/lib/auth/pin-lockout'
import type { ActionState } from '@/lib/action-state'
import { adminLoginSchema, formValue, invalid } from '@/lib/validation'
import { verifyAdminPin } from '@/server/tastings'

export async function manageLoginAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = { code: formValue(formData, 'code'), pin: formValue(formData, 'pin') }
  const parsed = adminLoginSchema.safeParse(raw)
  if (!parsed.success) return invalid(parsed.error, { code: raw.code })

  const result = await verifyAdminPin(db, parsed.data.code, parsed.data.pin)
  if (!result.ok) {
    const values = { code: raw.code }
    if (result.reason === 'locked') {
      const minutes = Math.max(1, Math.ceil((result.lockedUntil.getTime() - Date.now()) / 60_000))
      return { message: `Zu viele Versuche. Bitte in ${formatWait(minutes)} erneut versuchen.`, values }
    }
    if (result.reason === 'not_found') return { fieldErrors: { code: ['Zu diesem Code gibt es kein Tasting.'] }, values }
    return { fieldErrors: { pin: ['Die PIN stimmt nicht.'] }, values }
  }
  await setAdminCookie(result.tasting.code, result.tasting.id)
  redirect(`/tasting/${result.tasting.code}/admin`)
}
