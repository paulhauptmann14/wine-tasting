import type { ReactNode } from 'react'
import { SITE_FRAME_CLASSES } from '@/lib/site-frame'
import { cn } from '@/lib/utils'

const FRAME = 'mx-auto w-full pt-4 pb-32 lg:grid lg:grid-cols-[320px_minmax(0,1fr)] lg:pt-12 lg:pb-12'

type Props = {
  aside: ReactNode
  /** Phones show `top`, then the aside, then `children` – one copy of the aside for both layouts. */
  top?: ReactNode
  children: ReactNode
}

/**
 * Guest view: from lg, wine list left and content right (with `top` above `children`).
 * Phones: content only, or with `top` the list between `top` and `children`.
 */
export function TastingSplit({ aside, top, children }: Props) {
  if (top === undefined) {
    return (
      <main className={cn(FRAME, 'lg:gap-12', SITE_FRAME_CLASSES.page)}>
        <aside className="hidden lg:block" aria-label="Weine">
          <div className="sticky top-12">{aside}</div>
        </aside>
        <div className="min-w-0">{children}</div>
      </main>
    )
  }
  // The aside spans both rows; the auto row keeps `top` at its own height, the 1fr row takes the rest
  return (
    <main className={cn(FRAME, 'lg:grid-rows-[auto_1fr] lg:gap-x-12', SITE_FRAME_CLASSES.page)}>
      <div className="min-w-0 lg:col-start-2 lg:row-start-1">{top}</div>
      <aside className="mt-6 lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0" aria-label="Weine">
        <div className="lg:sticky lg:top-12">{aside}</div>
      </aside>
      <div className="min-w-0 lg:col-start-2 lg:row-start-2">{children}</div>
    </main>
  )
}
