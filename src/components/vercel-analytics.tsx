'use client'

import { Analytics } from '@vercel/analytics/next'
import { redactTastingCode } from '@/lib/analytics'

export function VercelAnalytics() {
  return <Analytics beforeSend={(event) => ({ ...event, url: redactTastingCode(event.url) })} />
}
