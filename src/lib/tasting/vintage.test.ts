import { describe, expect, it } from 'vitest'
import { isVintage, MAX_VINTAGE, MIN_VINTAGE } from './vintage'

describe('isVintage', () => {
  it('accepts whole years from 1900 to 2100', () => {
    expect([MIN_VINTAGE, MAX_VINTAGE]).toEqual([1900, 2100])
    for (const year of [1900, 1985, 2022, 2100]) expect(isVintage(year)).toBe(true)
  })

  it('rejects years outside the range, fractions and non-numbers', () => {
    for (const value of [1899, 2101, 2022.5, Number.NaN, Number.POSITIVE_INFINITY, 0, -2022]) {
      expect(isVintage(value)).toBe(false)
    }
  })
})
