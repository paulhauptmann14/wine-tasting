import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scryptAsync = promisify(scrypt) as (pw: string, salt: Buffer, keylen: number) => Promise<Buffer>
const KEY_LENGTH = 32

/** Format: scrypt$<salt base64url>$<key base64url> */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16)
  const key = await scryptAsync(pin, salt, KEY_LENGTH)
  return `scrypt$${salt.toString('base64url')}$${key.toString('base64url')}`
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [algorithm, salt, key] = stored.split('$')
  if (algorithm !== 'scrypt' || !salt || !key) return false
  const expected = Buffer.from(key, 'base64url')
  const actual = await scryptAsync(pin, Buffer.from(salt, 'base64url'), expected.length)
  return timingSafeEqual(actual, expected)
}
