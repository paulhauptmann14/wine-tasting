import { expect, it } from 'vitest'
import { isAuthorizedCron } from './cron'

const secret = 'a-made-up-cron-secret-for-tests'

it('accepts the bearer header that Vercel sends', () => {
  expect(isAuthorizedCron(`Bearer ${secret}`, secret)).toBe(true)
})

it('rejects missing, wrong or prefix-only headers', () => {
  expect(isAuthorizedCron(null, secret)).toBe(false)
  expect(isAuthorizedCron('', secret)).toBe(false)
  expect(isAuthorizedCron(secret, secret)).toBe(false)
  expect(isAuthorizedCron(`Bearer ${secret}x`, secret)).toBe(false)
  expect(isAuthorizedCron('Bearer ', secret)).toBe(false)
})

it('stays closed while no usable secret is configured', () => {
  expect(isAuthorizedCron('Bearer ', '')).toBe(false)
  expect(isAuthorizedCron('Bearer undefined', undefined)).toBe(false)
  expect(isAuthorizedCron('Bearer short', 'short')).toBe(false)
})
