'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/** Lädt Server-Daten neu, solange der Tab sichtbar ist (Live-Ergebnisse). */
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, intervalMs)
    return () => clearInterval(id)
  }, [router, intervalMs])
  return null
}
