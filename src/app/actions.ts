'use server'

import { redirect } from 'next/navigation'
import type { ActionState } from '@/lib/action-state'
import { getTasting } from '@/lib/data'
import { normalizeCode } from '@/lib/tasting/code'
import { formValue } from '@/lib/validation'

export async function goToTastingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = formValue(formData, 'code')
  const code = normalizeCode(raw)
  if (!code) return { fieldErrors: { code: ['Der Code hat 6 Zeichen, z. B. 7KX92P.'] }, values: { code: raw } }
  const tasting = await getTasting(code)
  if (!tasting) return { fieldErrors: { code: ['Zu diesem Code gibt es kein Tasting.'] }, values: { code: raw } }
  redirect(`/tasting/${tasting.code}`)
}
