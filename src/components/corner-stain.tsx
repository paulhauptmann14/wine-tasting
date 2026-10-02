import { GlassRing } from '@/components/glass-ring'

/**
 * Stain of a glass set down. Phone: cropped at the top right corner of the sheet.
 * Laptop: larger and cropped at the right edge of the screen, like on the home page.
 */
export function CornerStain({ seed }: { seed: number }) {
  return (
    <>
      <GlassRing seed={seed} size={170} className="pointer-events-none absolute -top-10 -right-24 lg:hidden" />
      <GlassRing
        seed={seed}
        size={300}
        className="pointer-events-none fixed top-20 -right-30 hidden lg:inline-grid"
      />
    </>
  )
}
