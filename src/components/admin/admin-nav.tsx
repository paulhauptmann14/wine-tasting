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
  return (
    <nav
      aria-label="Verwaltung"
      className="-mx-4 mb-8 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 lg:mx-0 lg:mb-0 lg:flex-col lg:px-0"
    >
      {TABS.map((tab) => {
        const href = base + tab.path
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={pathname === href ? 'page' : undefined}
            className="flex h-12 shrink-0 items-center rounded-full px-4 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-card aria-[current=page]:text-foreground lg:rounded-xl"
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
