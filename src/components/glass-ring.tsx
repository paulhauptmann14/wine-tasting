import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ringPath } from '@/lib/ring-path'
import type { RingState } from '@/server/participant-view'

type GlassRingProps = {
  seed: number
  state?: RingState
  size?: number
  animation?: 'draw' | 'soak'
  delayMs?: number
  /** Ohne Label ist der Ring dekorativ (aria-hidden). */
  label?: string
  className?: string
  children?: ReactNode
}

export function GlassRing({
  seed,
  state = 'done',
  size = 64,
  animation,
  delayMs = 0,
  label,
  className,
  children,
}: GlassRingProps) {
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center', animation === 'soak' && 'ring-soak', className)}
      style={{ width: size, height: size, animationDelay: `${delayMs}ms` }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        {state === 'done' ? (
          // Abdruck eines Weinglases: blasse Füllung, feiner geschlossener Innenrand,
          // kräftiger Rand mit Lücke und eine dunklere „Lippe“ – je Wein anders gedreht
          <g transform={`rotate(${(seed * 47) % 360} 50 50)`}>
            <path d={ringPath(seed, 38)} className="ring-fill fill-wine/[0.07]" />
            <path d={ringPath(seed + 7, 37)} fill="none" className="stroke-wine/30 [stroke-width:1]" />
            <path
              d={ringPath(seed + 3, 40.5)}
              pathLength={1}
              fill="none"
              strokeLinecap="round"
              className={cn('stroke-wine/85 [stroke-dasharray:0.82_1] [stroke-width:4.5]', animation === 'draw' && 'ring-draw')}
            />
            {/* Gleicher Pfad wie der Rand, nur ein Stück davon dicker: der Wein sammelt sich an einer Seite */}
            <path
              d={ringPath(seed + 3, 40.5)}
              pathLength={1}
              fill="none"
              strokeLinecap="round"
              className="stroke-wine/60 [stroke-dasharray:0.2_1] [stroke-dashoffset:-0.45] [stroke-width:7.5]"
            />
          </g>
        ) : (
          <path
            d={ringPath(seed, 40)}
            pathLength={1}
            fill="none"
            strokeLinecap="round"
            className={cn(
              state === 'open' && 'stroke-muted-foreground/50 [stroke-dasharray:0.02_0.025] [stroke-width:2.5]',
              state === 'incomplete' && 'stroke-star-edge [stroke-dasharray:0.02_0.025] [stroke-width:3]',
            )}
          />
        )}
      </svg>
      {children && <span className="relative leading-none">{children}</span>}
    </span>
  )
}
