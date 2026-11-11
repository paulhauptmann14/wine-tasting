'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ThemeToggle } from '@/components/theme-toggle'
import { SITE_FRAME_CLASSES, siteFrame } from '@/lib/site-frame'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * Slim bar on every page: the wordmark leads home from anywhere (admin area, guest pages, results),
 * the theme switch stays on the right. Same width and gutter as the page below (see site-frame).
 */
export function SiteHeader({ theme }: { theme: Theme | undefined }) {
  const pathname = usePathname()
  return (
    <header className={cn('mx-auto w-full pt-2', SITE_FRAME_CLASSES[siteFrame(pathname)])}>
      {/* Negative margin: tap areas reach into the gutter, the wordmark text stays on the content edge */}
      <div className="-mx-2 flex items-center justify-between">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          className="inline-flex h-12 items-center rounded-md px-2 font-display text-lg font-medium outline-none transition-opacity duration-100 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring active:opacity-50"
        >
          Wine Tasting
        </Link>
        <ThemeToggle initial={theme} />
      </div>
    </header>
  )
}
