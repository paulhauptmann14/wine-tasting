import { expect, it } from 'vitest'
import { generateSessionToken, hashToken } from './tokens'

it('generates unguessable url-safe tokens', () => {
  const t = generateSessionToken()
  expect(t).toMatch(/^[A-Za-z0-9_-]{43}$/)
  expect(generateSessionToken()).not.toBe(t)
})

it('hashes deterministically to hex sha256', () => {
  expect(hashToken('abc')).toBe(hashToken('abc'))
  expect(hashToken('abc')).toMatch(/^[0-9a-f]{64}$/)
  expect(hashToken('abc')).not.toBe(hashToken('abd'))
})
