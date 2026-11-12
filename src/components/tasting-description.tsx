import { cn } from '@/lib/utils'

/** The host's note under the tasting name. Renders nothing when empty; keeps the host's line breaks. */
export function TastingDescription({ text, className }: { text: string | null; className?: string }) {
  if (!text) return null
  return (
    <p className={cn('max-w-[60ch] whitespace-pre-line text-pretty break-words text-muted-foreground', className)}>
      {text}
    </p>
  )
}
