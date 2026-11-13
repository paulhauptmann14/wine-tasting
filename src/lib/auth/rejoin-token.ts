import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * Rejoin link for one guest: `<participantId>.<signature>`. Nothing secret is stored – the
 * signature is derived from the guest's id and link version, so the host can show the same link
 * again, and raising the version ("Link sperren") invalidates every older one.
 */
const SIGNATURE_BYTES = 16
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const BASE64URL = /^[\w-]{22}$/

// The "rejoin:" prefix keeps these signatures apart from admin tokens signed with the same secret
const sign = (participantId: string, version: number, secret: string) =>
  createHmac('sha256', secret).update(`rejoin:${participantId}:${version}`).digest().subarray(0, SIGNATURE_BYTES)

export function signRejoinToken(participantId: string, version: number, secret: string): string {
  return `${participantId}.${sign(participantId, version, secret).toString('base64url')}`
}

export type RejoinToken = { participantId: string; signature: string }

/** Shape check only – says nothing about validity. */
export function parseRejoinToken(token: string): RejoinToken | null {
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [participantId, signature] = parts
  if (!UUID.test(participantId) || !BASE64URL.test(signature)) return null
  return { participantId, signature }
}

export function verifyRejoinToken(token: RejoinToken, version: number, secret: string): boolean {
  // Compare the text, not the decoded bytes: the last base64url character has unused bits,
  // so decoding would accept other spellings of the same signature
  const expected = Buffer.from(sign(token.participantId, version, secret).toString('base64url'))
  const given = Buffer.from(token.signature)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
