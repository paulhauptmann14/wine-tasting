import { describe, expect, it } from 'vitest'
import { CODE_ALPHABET, CODE_LENGTH, generateCode, normalizeCode } from './code'

describe('generateCode', () => {
  it('produces codes of the right length from the safe alphabet', () => {
    for (let i = 0; i < 200; i++) {
      const code = generateCode()
      expect(code).toHaveLength(CODE_LENGTH)
      for (const ch of code) expect(CODE_ALPHABET).toContain(ch)
    }
  })
})

describe('normalizeCode', () => {
  it('trims and uppercases', () => {
    expect(normalizeCode(' 7kx92p ')).toBe('7KX92P')
  })
  it('rejects wrong length', () => {
    expect(normalizeCode('ABCDE')).toBeNull()
    expect(normalizeCode('ABCDEFG')).toBeNull()
  })
  it('rejects ambiguous characters', () => {
    expect(normalizeCode('ABCDE0')).toBeNull()
    expect(normalizeCode('ABCDE1')).toBeNull()
    expect(normalizeCode('ABCDEI')).toBeNull()
    expect(normalizeCode('ABCDEO')).toBeNull()
  })
})
