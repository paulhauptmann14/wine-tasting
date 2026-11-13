type OvalRingOptions = { rx: number; ry: number; cx?: number; cy?: number; steps?: number }

/** Wobbly outline points – deterministic per `seed` so server and client draw the same ring. */
function ringPoints(seed: number, { rx, ry, cx = 50, cy = 50, steps = 48 }: OvalRingOptions): [number, number][] {
  const points: [number, number][] = []
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const wobble = 1 + 0.018 * Math.sin(2 * a + seed * 1.7) + 0.01 * Math.sin(5 * a + seed * 0.9)
    points.push([cx + rx * wobble * Math.cos(a), cy + ry * wobble * Math.sin(a)])
  }
  return points
}

const closedPath = (points: [number, number][]) => `M${points.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join(' L')} Z`

/** One decimal, without a trailing ".0": a tenth of the 100-unit viewBox is sub-pixel even at 300 px. */
const tenth = (value: number) => String(Math.round(value * 10) / 10)

/**
 * Same outline, written short: every ring is part of the page payload (and of each 5-s refresh).
 * After the first point, plain coordinate pairs are implicit line-tos.
 */
const compactPath = (points: [number, number][]) => `M${points.map(([x, y]) => `${tenth(x)} ${tenth(y)}`).join(' ')}Z`

/**
 * Slightly irregular closed circle – the stain of a wine glass.
 * Deterministic per `seed` so server and client draw the same ring.
 */
export function ringPath(seed: number, r: number, center = 50, steps = 48): string {
  return compactPath(ringPoints(seed, { rx: r, ry: r, cx: center, cy: center, steps }))
}

/**
 * The same ring squashed into an oval – a stain seen at an angle, e.g. under the glass of the logo.
 * Starts on the right and runs clockwise on screen. `length` is the outline's length, for absolute
 * dash lengths (the PNG renderer resvg ignores pathLength).
 */
export function ovalRing(seed: number, options: OvalRingOptions): { d: string; length: number } {
  const points = ringPoints(seed, options)
  const length = points.reduce((sum, [x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length]
    return sum + Math.hypot(nx - x, ny - y)
  }, 0)
  return { d: closedPath(points), length }
}
