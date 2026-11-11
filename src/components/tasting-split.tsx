import type { ReactNode } from 'react'
import { SITE_FRAME_CLASSES } from '@/lib/site-frame'
import { cn } from '@/lib/utils'

/** Guest view: from lg, wine list left and content right. Mobile: content only. */
export function TastingSplit({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <main
      className={cn(
        'mx-auto w-full pt-4 pb-32 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12 lg:pt-12 lg:pb-12',
        SITE_FRAME_CLASSES.page,
      )}
    >
      <aside className="hidden lg:block" aria-label="Weine">
        <div className="sticky top-12">{aside}</div>
      </aside>
      <div className="min-w-0">{children}</div>
    </main>
  )
}
