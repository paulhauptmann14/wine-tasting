import { GlassRing } from '@/components/glass-ring'

/** Abdruck eines abgestellten Glases, angeschnitten an der oberen rechten Ecke des Bogens. */
export function CornerStain({ seed }: { seed: number }) {
  return (
    <GlassRing
      seed={seed}
      size={170}
      className="pointer-events-none absolute -top-10 -right-24 lg:-top-20 lg:-right-24"
    />
  )
}
