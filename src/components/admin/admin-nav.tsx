'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TABS = [
  { path: '', label: 'Teilen' },
  { path: '/general', label: 'Allgemein' },
  { path: '/wines', label: 'Weine' },
  { path: '/criteria', label: 'Bewertung' },
  { path: '/participants', label: 'Teilnehmer' },
  { path: '/results', label: 'Ergebnisse' },
]

export function AdminNav({ code }: { code: string }) {
  const pathname = usePathname()
  const base = `/tasting/${code}/admin`
  // Phone: the tabs wrap into two rows instead of scrolling sideways – no tab is cut off
  return (
    <nav
      aria-label="Verwaltung"
      className="mb-8 flex flex-wrap gap-x-5 border-b border-border lg:mb-0 lg:flex-col lg:flex-nowrap lg:gap-0 lg:border-b-0"
    >
      {TABS.map((tab) => {
        const href = base + tab.path
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className="-mb-px flex h-12 shrink-0 items-center border-b-2 border-transparent text-sm text-muted-foreground outline-none transition-opacity duration-100 hover:text-foreground active:opacity-50 focus-visible:text-foreground focus-visible:underline aria-[current=page]:border-wine aria-[current=page]:font-medium aria-[current=page]:text-foreground lg:mb-0 lg:border-b-0 lg:border-l-2 lg:pl-4"
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
