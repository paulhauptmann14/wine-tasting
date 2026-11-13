import { GlassRing } from '@/components/glass-ring'
import { GuardedLink } from '@/components/unsaved-guard'
import { cn } from '@/lib/utils'
import { RING_STATE_TEXT } from '@/lib/tasting/progress'
import type { WineListItem } from '@/server/participant-view'

type ListProps = { items: WineListItem[]; currentPosition?: number; savedPosition?: number }

/**
 * The number in the glass ring is hidden from screen readers, but it is the glass on the table:
 * name it in front of a wine name. Blind titles already are "Wein #n".
 */
function numberPrefix(item: WineListItem): string {
  const number = `Wein #${item.position}`
  return item.title === number ? '' : `${number}: `
}

export function WineList({ items, currentPosition, savedPosition }: ListProps) {
  return (
    <ol className="grid grid-cols-1 border-t border-border">
      {items.map((item) => (
        <li key={item.position} className="border-b border-border">
          <GuardedLink
            href={item.href}
            aria-current={item.position === currentPosition ? 'page' : undefined}
            className="group -mx-2 flex min-h-[4.5rem] items-center gap-4 rounded-lg px-2 py-2 outline-none transition-colors duration-100 hover:bg-card active:bg-secondary focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-card"
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
              <span className="block truncate font-display text-[17px] font-medium">
                {numberPrefix(item) && <span className="sr-only">{numberPrefix(item)}</span>}
                {item.title}
              </span>
              {item.subtitle && <span className="block truncate text-sm text-muted-foreground">{item.subtitle}</span>}
              {item.description && <span className="block truncate text-sm text-muted-foreground">{item.description}</span>}
            </span>
            <span
              className={cn(
                'shrink-0 text-xs',
                item.state === 'done' ? 'text-muted-foreground' : 'font-medium text-foreground',
              )}
            >
              {RING_STATE_TEXT[item.state]}
            </span>
          </GuardedLink>
        </li>
      ))}
    </ol>
  )
}

/** Mobile on the rating page: all wines as rings to jump between. */
export function WineRingStrip({ items, currentPosition, savedPosition }: ListProps) {
  return (
    <nav aria-label="Weine" className="-mx-4 flex gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden px-4 py-1 lg:hidden">
      {items.map((item) => (
        <GuardedLink
          key={item.position}
          href={item.href}
          aria-current={item.position === currentPosition ? 'page' : undefined}
          aria-label={`${numberPrefix(item)}${item.title}, ${RING_STATE_TEXT[item.state]}`}
          className="grid size-12 shrink-0 place-items-center rounded-full outline-none transition-transform duration-100 ease-out active:scale-90 focus-visible:ring-2 focus-visible:ring-ring aria-[current=page]:bg-card"
        >
          <GlassRing
            seed={item.position}
            state={item.state}
            size={40}
            animation={item.position === savedPosition ? 'draw' : undefined}
          >
            <span className="font-display text-sm font-medium">{item.position}</span>
          </GlassRing>
        </GuardedLink>
      ))}
    </nav>
  )
}
