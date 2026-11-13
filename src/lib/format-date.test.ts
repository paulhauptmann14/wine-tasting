import { expect, it } from 'vitest'
import { formatDate } from './format-date'

it('writes the date out in German', () => {
  expect(formatDate(new Date('2026-11-13T12:00:00Z'))).toBe('13. November 2026')
})

it('uses German time, not the server zone (Vercel runs in UTC)', () => {
  // 00:30 in Berlin (winter time, UTC+1) is still the previous day in UTC
  expect(formatDate(new Date('2026-02-28T23:30:00Z'))).toBe('1. März 2026')
  // 01:30 in Berlin (summer time, UTC+2)
  expect(formatDate(new Date('2026-07-31T23:30:00Z'))).toBe('1. August 2026')
})
