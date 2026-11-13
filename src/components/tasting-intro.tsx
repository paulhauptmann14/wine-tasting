import type { ReactNode } from 'react'
import { CornerStain } from '@/components/corner-stain'
import { TastingDescription } from '@/components/tasting-description'
import { cn } from '@/lib/utils'

/**
 * Large title on the corner stain, with an optional small line above it – the start of every
 * pre-tasting view (invitation, waiting, rejoin) and of the "not found" page.
 */
export function TastingIntro({
  title,
  seed,
  kicker,
  description = null,
  sentence = false,
  children,
}: {
  title: ReactNode
  /** Turns the stain; the pages use the tasting name's length */
  seed: number
  kicker?: ReactNode
  /** The host's note under the tasting name */
  description?: string | null
  /** A whole sentence instead of a name: stays a size smaller on laptops */
  sentence?: boolean
  children?: ReactNode
}) {
  return (
    <div className="relative">
      <CornerStain seed={seed} />
      {kicker !== undefined && <p className="relative pt-28 text-sm text-muted-foreground lg:pt-16">{kicker}</p>}
      <h1
        className={cn(
          'relative font-display text-4xl leading-[1.08] font-medium tracking-tight md:text-5xl',
          kicker !== undefined ? 'mt-1' : 'pt-28 lg:pt-16',
          !sentence && 'lg:text-6xl lg:leading-[1.02]',
        )}
      >
        {title}
      </h1>
      <TastingDescription text={description} className="relative mt-3" />
      {children}
    </div>
  )
}

/** Muted hint under the intro title */
export function IntroNote({ className, children }: { className?: string; children: ReactNode }) {
  return <p className={cn('relative mt-4 max-w-[34ch] text-muted-foreground', className)}>{children}</p>
}
