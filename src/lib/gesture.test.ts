import { describe, expect, it } from 'vitest'
import { decideSwipe, project, rubberband, springStep } from './gesture'

describe('project', () => {
  it('projects where a flick comes to rest, like scroll deceleration', () => {
    expect(project(0)).toBe(0)
    expect(project(1000)).toBeCloseTo(499, 0)
    expect(project(-1000)).toBeCloseTo(-499, 0)
  })
})

describe('rubberband', () => {
  it('follows less the further past the edge', () => {
    const a = rubberband(50, 375)
    const b = rubberband(200, 375)
    expect(a).toBeLessThan(50)
    expect(b - a).toBeLessThan(150)
    expect(rubberband(-200, 375)).toBe(-b)
  })
})

describe('springStep', () => {
  it('settles on the target without overshoot when critically damped', () => {
    let s = { x: 0, v: 0 }
    let max = 0
    for (let i = 0; i < 120; i++) {
      s = springStep(s, 100, 1 / 60)
      max = Math.max(max, s.x)
    }
    expect(s.x).toBeCloseTo(100, 0)
    expect(max).toBeLessThanOrEqual(100.5)
  })

  it('carries the initial velocity', () => {
    const moving = springStep({ x: 0, v: -2000 }, 0, 1 / 60)
    expect(moving.x).toBeLessThan(0)
  })
})

describe('decideSwipe', () => {
  const base = { width: 375, hasPrev: true, hasNext: true }
  it('goes to the next wine when dragged or flicked far enough left', () => {
    expect(decideSwipe({ ...base, offset: -220, velocity: 0 })).toBe('next')
    expect(decideSwipe({ ...base, offset: -60, velocity: -900 })).toBe('next')
  })
  it('goes back when moved right', () => {
    expect(decideSwipe({ ...base, offset: 220, velocity: 0 })).toBe('prev')
  })
  it('stays for short drags and when a flick reverses', () => {
    expect(decideSwipe({ ...base, offset: -60, velocity: 0 })).toBeNull()
    expect(decideSwipe({ ...base, offset: -220, velocity: 900 })).toBeNull()
  })
  it('stays at the first and last wine', () => {
    expect(decideSwipe({ ...base, hasNext: false, offset: -300, velocity: -900 })).toBeNull()
    expect(decideSwipe({ ...base, hasPrev: false, offset: 300, velocity: 900 })).toBeNull()
  })
})
