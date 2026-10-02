import { cn } from '@/lib/utils'

/** Der Tasting-Code klein in Mono – zum Weitersagen. Kein Geheimnis, anders als die Session. */
export function TastingCode({ code, className }: { code: string; className?: string }) {
  return (
    <p className={cn('font-mono text-xs tracking-[0.3em] text-muted-foreground', className)}>
      <span className="sr-only">Code </span>
      {code}
    </p>
  )
}
