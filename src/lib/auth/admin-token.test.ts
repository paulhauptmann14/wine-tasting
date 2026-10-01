import { expect, it } from 'vitest'
import { signAdminToken, verifyAdminToken } from './admin-token'

const secret = 'test-secret-that-is-long-enough-1234567890'
const id = '6f1c1a5e-1111-4222-8333-944455556666'
const now = new Date('2026-10-01T20:00:00Z')
const later = new Date('2026-10-08T20:00:00Z')

it('round-trips a valid token', () => {
  expect(verifyAdminToken(signAdminToken(id, later, secret), secret, now)).toEqual({ tastingId: id })
})

it('rejects tampered, foreign or expired tokens', () => {
  const token = signAdminToken(id, later, secret)
  const [, exp, sig] = token.split('.')
  expect(verifyAdminToken(`00000000-0000-4000-8000-000000000000.${exp}.${sig}`, secret, now)).toBeNull()
  expect(verifyAdminToken(token, `${secret}x`, now)).toBeNull()
  expect(verifyAdminToken(token, secret, new Date('2026-10-09T00:00:00Z'))).toBeNull()
  expect(verifyAdminToken('abc', secret, now)).toBeNull()
})
