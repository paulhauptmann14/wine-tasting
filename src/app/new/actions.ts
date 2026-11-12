'use server'

import { redirect } from 'next/navigation'
import { db } from '@/db/client'
import { setAdminCookie } from '@/lib/auth/admin-session'
import type { ActionState } from '@/lib/action-state'
import { createTastingSchema, formValue, invalid } from '@/lib/validation'
import { createTasting } from '@/server/tastings'

export async function createTastingAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const raw = {
    name: formValue(formData, 'name'),
    description: formValue(formData, 'description'),
    blindTasting: formData.get('blindTasting') === 'on',
    preset: formValue(formData, 'preset'),
    pin: formValue(formData, 'pin'),
  }
  const parsed = createTastingSchema.safeParse(raw)
  if (!parsed.success) {
    return invalid(parsed.error, {
      name: raw.name,
      description: raw.description,
      preset: raw.preset,
      blindTasting: raw.blindTasting ? 'on' : 'off',
    })
  }
  const tasting = await createTasting(db, parsed.data)
  await setAdminCookie(tasting.code, tasting.id)
  redirect(`/tasting/${tasting.code}/admin`)
}
