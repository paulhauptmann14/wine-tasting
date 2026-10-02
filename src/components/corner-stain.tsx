import { GlassRing } from '@/components/glass-ring'

/** Stain of a glass set down, cropped at the top right corner of the sheet. */
export function CornerStain({ seed }: { seed: number }) {
  return (
    <GlassRing
      seed={seed}
      size={170}
      className="pointer-events-none absolute -top-10 -right-24 lg:-top-20 lg:-right-24"
    />
  )
}
