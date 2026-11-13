import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ringPath } from '@/lib/ring-path'
import type { RingState } from '@/lib/tasting/progress'

type Animation = 'draw' | 'soak'

type FrameProps = {
  size?: number
  animation?: Animation
  delayMs?: number
  /** Without a label the ring is decorative (aria-hidden). */
  label?: string
  className?: string
  children?: ReactNode
}

type GlassRingProps = FrameProps & { seed: number; state?: RingState }

const RIM_POOL_CLASS = 'stroke-wine/60 [stroke-dasharray:0.2_1] [stroke-dashoffset:-0.45] [stroke-width:7.5]'

/**
 * The drawing in the 100×100 viewBox. With `rimId` the rim outline is written once and drawn a
 * second time through `<use>`; without (inside a shared <symbol>) it is simply written twice.
 */
function RingArt({ seed, state, animation, rimId }: { seed: number; state: RingState; animation?: Animation; rimId?: string }) {
  if (state !== 'done') {
    return (
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
    )
  }
  const rim = ringPath(seed + 3, 40.5)
  const rimClass = cn('stroke-wine/85 [stroke-dasharray:0.82_1] [stroke-width:4.5]', animation === 'draw' && 'ring-draw')
  return (
    // Stain of a wine glass: pale fill, fine closed inner rim,
    // bold rim with a gap and a darker "lip" – rotated differently per wine
    <g transform={`rotate(${(seed * 47) % 360} 50 50)`}>
      <path d={ringPath(seed, 38)} className="ring-fill fill-wine/[0.07]" />
      <path d={ringPath(seed + 7, 37)} fill="none" className="stroke-wine/30 [stroke-width:1]" />
      {rimId ? (
        <>
          {/* The rim takes its stroke from the group, so the <use> below can draw the same outline differently */}
          <g className={rimClass}>
            <path id={rimId} d={rim} pathLength={1} fill="none" strokeLinecap="round" />
          </g>
          {/* Same outline, with one part thicker: the wine pools on one side */}
          <use href={`#${rimId}`} className={RIM_POOL_CLASS} />
        </>
      ) : (
        <>
          <path d={rim} pathLength={1} fill="none" strokeLinecap="round" className={rimClass} />
          <path d={rim} pathLength={1} fill="none" strokeLinecap="round" className={RIM_POOL_CLASS} />
        </>
      )}
    </g>
  )
}

/** Box, accessible name and number of a ring; `art` is the SVG content in the 100×100 viewBox. */
function RingFrame({ size = 64, animation, delayMs = 0, label, className, children, art }: FrameProps & { art: ReactNode }) {
  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center', animation === 'soak' && 'ring-soak', className)}
      style={{ width: size, height: size, animationDelay: `${delayMs}ms` }}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full overflow-visible">
        {art}
      </svg>
      {children && <span className="relative leading-none">{children}</span>}
    </span>
  )
}

export function GlassRing({ seed, state = 'done', animation, ...frame }: GlassRingProps) {
  const rimId = useId()
  return <RingFrame animation={animation} {...frame} art={<RingArt seed={seed} state={state} animation={animation} rimId={rimId} />} />
}

const RING_STATES: RingState[] = ['done', 'open', 'incomplete']

export const ringShapeId = (idPrefix: string, seed: number, state: RingState) => `${idPrefix}-${seed}-${state}`

/**
 * Every ring shape for seeds 1..count, drawn once per page as <symbol>s. Many small rings
 * (<GlassRingUse>) then only point at them: same look, a fraction of the markup.
 * `idPrefix` must be unique on the page.
 */
export function GlassRingDefs({ idPrefix, count }: { idPrefix: string; count: number }) {
  return (
    <svg aria-hidden className="absolute size-0">
      <defs>
        {Array.from({ length: count }, (_, i) =>
          RING_STATES.map((state) => (
            <symbol
              key={`${i + 1}-${state}`}
              id={ringShapeId(idPrefix, i + 1, state)}
              viewBox="0 0 100 100"
              overflow="visible"
            >
              <RingArt seed={i + 1} state={state} />
            </symbol>
          )),
        )}
      </defs>
    </svg>
  )
}

/** A ring drawn from a shape of <GlassRingDefs> with the same `idPrefix`. No animations. */
export function GlassRingUse({
  idPrefix,
  seed,
  state,
  ...frame
}: Omit<FrameProps, 'animation' | 'delayMs'> & { idPrefix: string; seed: number; state: RingState }) {
  return <RingFrame {...frame} art={<use href={`#${ringShapeId(idPrefix, seed, state)}`} width="100" height="100" />} />
}
