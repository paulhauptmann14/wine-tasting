import { expect, it } from 'vitest'
import { hashPin, verifyPin } from './pin'

it('hashes with a random salt and verifies', async () => {
  const a = await hashPin('1234')
  const b = await hashPin('1234')
  expect(a).toMatch(/^scrypt\$/)
  expect(a).not.toBe(b)
  expect(a).not.toContain('1234')
  expect(await verifyPin('1234', a)).toBe(true)
  expect(await verifyPin('4321', a)).toBe(false)
})

it('rejects malformed hashes', async () => {
  expect(await verifyPin('1234', 'garbage')).toBe(false)
  expect(await verifyPin('1234', 'scrypt$only-salt')).toBe(false)
})
