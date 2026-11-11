import { GLASS_MARK_ROOT, glassMarkPartAttributes, glassMarkParts } from '@/lib/glass-mark'

/**
 * The logo – glass in its glass-ring stain – inline in the text color (e.g. `text-wine`).
 * Decorative: the surrounding link or heading carries the name.
 */
export function GlassMark({ className }: { className?: string }) {
  return (
    <svg {...GLASS_MARK_ROOT} aria-hidden focusable="false" className={className}>
      {glassMarkParts().map((part, i) => (
        <path key={i} {...glassMarkPartAttributes(part)} />
      ))}
    </svg>
  )
}
