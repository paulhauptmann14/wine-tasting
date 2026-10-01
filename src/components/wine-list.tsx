import Link from 'next/link'
import { GlassRing } from '@/components/glass-ring'
import type { RingState, WineListItem } from '@/server/participant-view'

const STATE_TEXT: Record<RingState, string> = { open: 'Noch offen', incomplete: 'Bitte ergänzen', done: 'Bewertet' }

type ListProps = { items: WineListItem[]; currentPosition?: number; savedPosition?: number }

export function WineList({ items, currentPosition, savedPosition }: ListProps) {
  return (
    <ol className="grid gap-1">
      {items.map((item) => (
        <li key={item.position}>
          <Link
            href={item.href}
            aria-current={item.position === currentPosition ? 'page' : undefined}
            className="flex min-h-16 items-center gap-4 rounded-2xl px-3 py-2 outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-card"
          >
            <GlassRing
              seed={item.position}
              state={item.state}
              size={52}
              animation={item.position === savedPosition ? 'draw' : undefined}
            >
              <span className="font-display text-lg">{item.position}</span>
            </GlassRing>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{item.title}</span>
              {item.subtitle && <span className="block truncate text-sm text-muted-foreground">{item.subtitle}</span>}
              <span className="block text-xs text-muted-foreground">{STATE_TEXT[item.state]}</span>
            </span>
          </Link>
        </li>
      ))}
    </ol>
  )
}

/** Mobil auf der Bewertungsseite: alle Weine als Ringe zum Springen. */
export function WineRingStrip({ items, currentPosition, savedPosition }: ListProps) {
  return (
    <nav aria-label="Weine" className="-mx-4 flex gap-1 overflow-x-auto px-4 py-1 lg:hidden">
      {items.map((item) => (
        <Link
          key={item.position}
          href={item.href}
          aria-current={item.position === currentPosition ? 'page' : undefined}
          aria-label={`${item.title}, ${STATE_TEXT[item.state]}`}
          className="grid size-12 shrink-0 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-card"
        >
          <GlassRing
            seed={item.position}
            state={item.state}
            size={40}
            animation={item.position === savedPosition ? 'draw' : undefined}
          >
            <span className="font-display text-sm">{item.position}</span>
          </GlassRing>
        </Link>
      ))}
    </nav>
  )
}
