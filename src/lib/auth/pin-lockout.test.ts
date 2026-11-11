import { expect, it } from 'vitest'
import { formatWait, lockMinutes } from './pin-lockout'

it('doubles the lock with every further lockout, capped at a day', () => {
  expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 20].map(lockMinutes)).toEqual([10, 20, 40, 80, 160, 320, 640, 1280, 1440, 1440])
})

it('treats a missing or broken count as the first lockout', () => {
  expect(lockMinutes(0)).toBe(10)
  expect(lockMinutes(-3)).toBe(10)
})

it('makes trying all 10,000 four-digit PINs take years', () => {
  const locksNeeded = 10_000 / 5
  const totalMinutes = Array.from({ length: locksNeeded }, (_, i) => lockMinutes(i + 1)).reduce((a, b) => a + b, 0)
  expect(totalMinutes / 60 / 24 / 365).toBeGreaterThan(5)
})

it('says how long to wait in minutes or hours', () => {
  expect(formatWait(1)).toBe('1 Minute')
  expect(formatWait(10)).toBe('10 Minuten')
  expect(formatWait(59)).toBe('59 Minuten')
  expect(formatWait(60)).toBe('1 Stunde')
  expect(formatWait(61)).toBe('2 Stunden')
  expect(formatWait(1440)).toBe('24 Stunden')
})
