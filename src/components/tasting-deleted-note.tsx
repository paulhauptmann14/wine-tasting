'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { marginNote } from '@/components/styles'
import { cn } from '@/lib/utils'

/** Query parameter deleteTastingAction appends to its redirect ('/?deleted=1') */
const DELETED_PARAM = 'deleted'

/**
 * One-time "Tasting gelöscht." on the home page after deleting. The parameter is removed from the
 * address right away, so a reload or a shared link doesn't show it again.
 * Uses useSearchParams – render it inside <Suspense> so the home page stays static.
 */
export function TastingDeletedNote({ className }: { className?: string }) {
  const params = useSearchParams()
  // Read once: removing the parameter below must not hide the note again
  const [show] = useState(() => params.get(DELETED_PARAM) === '1')

  useEffect(() => {
    if (!show) return
    const url = new URL(window.location.href)
    url.searchParams.delete(DELETED_PARAM)
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }, [show])

  if (!show) return null
  return (
    <p role="status" className={cn(marginNote, className)}>
      Tasting gelöscht.
    </p>
  )
}
