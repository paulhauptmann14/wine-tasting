/**
 * Slightly irregular closed circle – the stain of a wine glass.
 * Deterministic per `seed` so server and client draw the same ring.
 */
export function ringPath(seed: number, r: number, center = 50, steps = 48): string {
  const points: string[] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const wobble = 1 + 0.018 * Math.sin(2 * a + seed * 1.7) + 0.01 * Math.sin(5 * a + seed * 0.9)
    const x = center + r * wobble * Math.cos(a)
    const y = center + r * wobble * Math.sin(a)
    points.push(`${x.toFixed(2)} ${y.toFixed(2)}`)
  }
  return `M${points.join(' L')} Z`
}
