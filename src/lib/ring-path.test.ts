import { expect, it } from 'vitest'
import { ovalRing, ringPath } from './ring-path'

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

it('keeps the round ring unchanged when shared with the oval ring', () => {
  // Pinned so <GlassRing> doesn't shift when the ring math is shared
  expect(ringPath(5, 38).slice(0, 25)).toBe('M88.17 50.00 L87.75 54.97')
  expect(ovalRing(5, { rx: 38, ry: 38 }).d).toBe(ringPath(5, 38))
})

it('squashes the ring into an oval around its own center', () => {
  const { d } = ovalRing(8, { rx: 42, ry: 14, cx: 50, cy: 81 })
  const points = [...d.matchAll(/(-?\d+\.\d+) (-?\d+\.\d+)/g)].map((m) => [Number(m[1]), Number(m[2])])
  const xs = points.map(([x]) => x)
  const ys = points.map(([, y]) => y)
  expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(2 * 42 * 0.95)
  expect(Math.max(...ys) - Math.min(...ys)).toBeLessThan(2 * 14 * 1.05)
  expect((Math.max(...ys) + Math.min(...ys)) / 2).toBeCloseTo(81, 0)
})

it('measures the drawn outline for absolute dash lengths', () => {
  // A circle of radius 40 is about 251 long; the wobble and the polygon change that only slightly
  expect(ovalRing(3, { rx: 40, ry: 40 }).length).toBeCloseTo(2 * Math.PI * 40, -1)
  const flat = ovalRing(3, { rx: 40, ry: 10 }).length
  expect(flat).toBeGreaterThan(160)
  expect(flat).toBeLessThan(180)
})
