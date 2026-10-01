import { expect, it } from 'vitest'
import { ringPath } from './ring-path'

it('is deterministic per seed and differs between seeds', () => {
  expect(ringPath(3, 40)).toBe(ringPath(3, 40))
  expect(ringPath(3, 40)).not.toBe(ringPath(4, 40))
})

it('draws a closed, slightly irregular ring around the center', () => {
  const d = ringPath(7, 40)
  expect(d.startsWith('M')).toBe(true)
  expect(d.endsWith('Z')).toBe(true)
  const points = [...d.matchAll(/(-?\d+\.\d+) (-?\d+\.\d+)/g)].map((m) => [Number(m[1]), Number(m[2])])
  const radii = points.map(([x, y]) => Math.hypot(x - 50, y - 50))
  expect(Math.min(...radii)).toBeGreaterThan(40 * 0.93)
  expect(Math.max(...radii)).toBeLessThan(40 * 1.07)
  expect(new Set(radii.map((r) => r.toFixed(1))).size).toBeGreaterThan(3)
})
