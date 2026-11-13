import { expect, it } from 'vitest'
import { parsePosition } from './search-params'

it('reads a wine number of 1 or more', () => {
  expect(parsePosition('1')).toBe(1)
  expect(parsePosition('12')).toBe(12)
})

it('ignores missing, empty, zero, negative, fractional and non-numeric values', () => {
  for (const value of [undefined, '', '0', '-1', '1.5', 'abc', 'NaN', 'Infinity']) {
    expect(parsePosition(value)).toBeUndefined()
  }
})
