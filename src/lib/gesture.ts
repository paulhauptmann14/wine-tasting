/*
 * Gesture math after Apple's "Designing Fluid Interfaces" (WWDC 2018):
 * project momentum, resist at edges, and animate with velocity-aware springs.
 */

/** Where a flick comes to rest (exponential decay, like scrolling). Velocity in px/s, result in px. */
export function project(velocity: number, decelerationRate = 0.998): number {
  return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate)
}

/** Past an edge the content follows less and less – soft resistance instead of a hard stop. */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot))
}

type SpringState = { x: number; v: number }

/**
 * One step of a spring towards `target` (semi-implicit Euler, mass 1).
 * response = seconds to (roughly) reach the target, damping 1 = critically damped, no overshoot.
 */
export function springStep(
  { x, v }: SpringState,
  target: number,
  dt: number,
  { response = 0.35, damping = 1 }: { response?: number; damping?: number } = {},
): SpringState {
  const stiffness = (2 * Math.PI / response) ** 2
  const friction = (4 * Math.PI * damping) / response
  const nextV = v + (-stiffness * (x - target) - friction * v) * dt
  return { x: x + nextV * dt, v: nextV }
}

/** Decides from the projected resting point, so a quick flick counts as much as a long drag. */
export function decideSwipe(input: {
  offset: number
  velocity: number
  width: number
  hasPrev: boolean
  hasNext: boolean
}): 'prev' | 'next' | null {
  const { offset, velocity, width, hasPrev, hasNext } = input
  const projected = offset + project(velocity)
  // A flick against the drag means "never mind" – back to the middle, not to the other neighbour
  if (offset < 0 && projected < -width / 2 && hasNext) return 'next'
  if (offset > 0 && projected > width / 2 && hasPrev) return 'prev'
  return null
}
