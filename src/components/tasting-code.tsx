import { CopyCodeButton } from '@/components/copy-code-button'
import { cn } from '@/lib/utils'

/** The tasting code, small in mono with a copy button – for passing on. Not a secret, unlike the session. */
export function TastingCode({ code, className }: { code: string; className?: string }) {
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">
        <span className="sr-only">Code </span>
        {code}
      </p>
      <CopyCodeButton code={code} />
    </div>
  )
}
