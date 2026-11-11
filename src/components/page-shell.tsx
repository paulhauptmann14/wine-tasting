import type { ReactNode } from 'react'
import { SITE_FRAME_CLASSES } from '@/lib/site-frame'
import { cn } from '@/lib/utils'

/**
 * narrow: forms and entry pages – one column; on laptop left-aligned on the open page like the home page.
 * wide: results.
 */
export function PageShell({ children, width = 'narrow' }: { children: ReactNode; width?: 'narrow' | 'wide' }) {
  return (
    <main
      className={cn(
        'mx-auto w-full pt-6 pb-32 lg:pb-16',
        SITE_FRAME_CLASSES.page,
        width === 'narrow' && 'lg:pt-4',
        width === 'wide' && 'lg:max-w-[960px] lg:pt-12',
      )}
    >
      {width === 'narrow' ? <div className="lg:max-w-xl">{children}</div> : children}
    </main>
  )
}
