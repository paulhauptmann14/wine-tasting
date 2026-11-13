import { expect, it } from 'vitest'
import { signAdminToken } from './admin-token'
import { parseRejoinToken, signRejoinToken, verifyRejoinToken } from './rejoin-token'

const secret = 'test-secret-that-is-long-enough-1234567890'
const id = '6f1c1a5e-1111-4222-8333-944455556666'
const other = '00000000-0000-4000-8000-000000000000'

it('is stable for the same guest and version, so the host can show it again', () => {
  const token = signRejoinToken(id, 0, secret)
  expect(token).toBe(signRejoinToken(id, 0, secret))
  expect(token).toMatch(/^[0-9a-f-]{36}\.[\w-]{22}$/)
  expect(parseRejoinToken(token)).toEqual({ participantId: id, signature: token.split('.')[1] })
})

it('verifies only the same guest, version and secret', () => {
  const token = signRejoinToken(id, 2, secret)
  const parsed = parseRejoinToken(token)!
  expect(verifyRejoinToken(parsed, 2, secret)).toBe(true)
  // A new version (link locked) makes the old link invalid
  expect(verifyRejoinToken(parsed, 3, secret)).toBe(false)
  expect(verifyRejoinToken({ ...parsed, participantId: other }, 2, secret)).toBe(false)
  expect(verifyRejoinToken(parsed, 2, `${secret}x`)).toBe(false)
  expect(verifyRejoinToken({ ...parsed, signature: 'AAAA' }, 2, secret)).toBe(false)
})

it('accepts only the exact signature text, not other spellings of the same bytes', () => {
  const token = signRejoinToken(id, 0, secret)
  const parsed = parseRejoinToken(token)!
  // 16 bytes in 22 characters: the last character carries 4 unused bits
  const last = parsed.signature.at(-1)!
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const sameBytes = alphabet[alphabet.indexOf(last) + 1]
  const variant = `${parsed.signature.slice(0, -1)}${sameBytes}`
  expect(Buffer.from(variant, 'base64url')).toEqual(Buffer.from(parsed.signature, 'base64url'))
  expect(verifyRejoinToken({ ...parsed, signature: variant }, 0, secret)).toBe(false)
})

it('rejects malformed tokens', () => {
  for (const bad of ['', 'abc', `${id}`, `${id}.`, `nope.${'a'.repeat(22)}`, `${id}.${'a'.repeat(22)}.x`, `${id}.${'!'.repeat(22)}`]) {
    expect(parseRejoinToken(bad), bad).toBeNull()
  }
})

it('never matches an admin token signed with the same secret', () => {
  const admin = signAdminToken(id, new Date('2030-01-01'), secret)
  const signature = admin.split('.')[2]
  expect(verifyRejoinToken({ participantId: id, signature }, 0, secret)).toBe(false)
})
