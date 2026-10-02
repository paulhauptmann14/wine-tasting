import Link from 'next/link'
import { GlassRing } from '@/components/glass-ring'
import { cn } from '@/lib/utils'
import type { RingState, WineListItem } from '@/server/participant-view'

const STATE_TEXT: Record<RingState, string> = { open: 'offen', incomplete: 'ergänzen', done: 'bewertet' }

type ListProps = { items: WineListItem[]; currentPosition?: number; savedPosition?: number }

export function WineList({ items, currentPosition, savedPosition }: ListProps) {
  return (
    <ol className="grid grid-cols-1 border-t border-border">
      {items.map((item) => (
        <li key={item.position} className="border-b border-border">
          <Link
            href={item.href}
            aria-current={item.position === currentPosition ? 'page' : undefined}
            className="group -mx-2 flex min-h-[4.5rem] items-center gap-4 rounded-lg px-2 py-2 outline-none hover:bg-card focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-card"
          >
            <GlassRing
              seed={item.position}
              state={item.state}
              size={52}
              animation={item.position === savedPosition ? 'draw' : undefined}
            >
              <span className="font-display text-lg font-medium">{item.position}</span>
            </GlassRing>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-[17px] font-medium">{item.title}</span>
              {item.subtitle && <span className="block truncate text-sm text-muted-foreground">{item.subtitle}</span>}
            </span>
            <span
              className={cn(
                'shrink-0 text-xs',
                item.state === 'done' ? 'text-muted-foreground' : 'font-medium text-foreground',
              )}
            >
              {STATE_TEXT[item.state]}
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
    <nav aria-label="Weine" className="-mx-4 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-1 lg:hidden">
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
            <span className="font-display text-sm font-medium">{item.position}</span>
          </GlassRing>
        </Link>
      ))}
    </nav>
  )
}
