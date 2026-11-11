'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { GlassMark } from '@/components/glass-mark'
import { ThemeToggle } from '@/components/theme-toggle'
import { SITE_FRAME_CLASSES, siteFrame } from '@/lib/site-frame'
import type { Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

/**
 * Slim bar on every page: the glass mark leads home from anywhere (admin area, guest pages, results),
 * the theme switch stays on the right. Same width and gutter as the page below (see site-frame).
 */
export function SiteHeader({ theme }: { theme: Theme | undefined }) {
  const pathname = usePathname()
  return (
    <header className={cn('mx-auto w-full pt-2', SITE_FRAME_CLASSES[siteFrame(pathname)])}>
      {/* Negative margin: tap areas reach into the gutter, the mark stays on the content edge */}
      <div className="-mx-2 flex items-center justify-between">
        <Link
          href="/"
          aria-current={pathname === '/' ? 'page' : undefined}
          aria-label="Wine Tasting – zur Startseite"
          className="flex size-12 items-center rounded-md px-2 text-wine outline-none transition-opacity duration-100 hover:opacity-70 focus-visible:ring-2 focus-visible:ring-ring active:opacity-50"
        >
          <GlassMark className="size-8" />
        </Link>
        <ThemeToggle initial={theme} />
      </div>
    </header>
  )
}
