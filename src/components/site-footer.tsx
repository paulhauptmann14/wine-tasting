'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SITE_FRAME_CLASSES, siteFrame } from '@/lib/site-frame'
import { cn } from '@/lib/utils'

/** Legal links on every page. Extra bottom space on phones, so the fixed action bar never covers them. */
export function SiteFooter() {
  const frame = siteFrame(usePathname())
  const link = 'inline-flex h-12 items-center transition-opacity duration-100 hover:text-foreground active:opacity-50'
  return (
    <footer
      className={cn(
        'mx-auto flex w-full gap-6 pb-[calc(6rem+env(safe-area-inset-bottom))] text-sm text-muted-foreground lg:pb-6',
        SITE_FRAME_CLASSES[frame],
      )}
    >
      <Link href="/impressum" className={link}>
        Impressum
      </Link>
      <Link href="/datenschutz" className={link}>
        Datenschutz
      </Link>
    </footer>
  )
}
