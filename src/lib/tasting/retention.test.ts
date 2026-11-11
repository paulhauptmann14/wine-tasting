import { expect, it } from 'vitest'
import { RETENTION_DAYS, deletionDate, isExpired, retentionCutoff } from './retention'

it('keeps a tasting for 90 days after it was created', () => {
  const created = new Date('2026-11-01T20:00:00Z')
  expect(RETENTION_DAYS).toBe(90)
  expect(deletionDate(created).toISOString()).toBe('2027-01-30T20:00:00.000Z')
  expect(isExpired(created, new Date('2027-01-30T19:59:59Z'))).toBe(false)
  expect(isExpired(created, new Date('2027-01-30T20:00:00Z'))).toBe(true)
})

it('cutoff is the creation date that expires right now – same rule as isExpired', () => {
  const now = new Date('2027-01-30T20:00:00Z')
  const cutoff = retentionCutoff(now)
  expect(cutoff.toISOString()).toBe('2026-11-01T20:00:00.000Z')
  expect(isExpired(cutoff, now)).toBe(true)
  expect(isExpired(new Date(cutoff.getTime() + 1), now)).toBe(false)
})
