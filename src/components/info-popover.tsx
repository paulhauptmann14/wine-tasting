'use client'

import { Info } from 'lucide-react'
import type { ReactNode } from 'react'
import { Popover } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Small "ⓘ" button that opens a short explanation. Radix handles the keyboard (Enter/Space opens,
 * Escape closes), focus return and closing on outside clicks. Use sparingly: only for explanations
 * that are longer than two sentences and rarely needed.
 */
export function InfoPopover({
  label,
  children,
  className,
}: {
  /** Accessible name of the trigger, also the question the popover answers */
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <Popover.Root>
      <Popover.Trigger
        aria-label={label}
        className={cn(
          'inline-flex size-12 shrink-0 items-center justify-center rounded-full text-muted-foreground outline-none transition-opacity duration-100 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-50',
          className,
        )}
      >
        <Info className="size-5" aria-hidden />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={16}
          className="z-50 w-[min(22rem,calc(100vw-2rem))] border-l-2 border-wine bg-card p-4 text-sm leading-relaxed text-foreground shadow-lg outline-none ring-1 ring-border"
        >
          {children}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
