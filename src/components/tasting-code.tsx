import { cn } from '@/lib/utils'

/** The tasting code, small in mono – for passing on. Not a secret, unlike the session. */
export function TastingCode({ code, className }: { code: string; className?: string }) {
  return (
    <p className={cn('font-mono text-xs tracking-[0.3em] text-muted-foreground', className)}>
      <span className="sr-only">Code </span>
      {code}
    </p>
  )
}
