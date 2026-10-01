import { expect, it } from 'vitest'
import { parseTheme } from './theme'

it('accepts only light or dark', () => {
  expect(parseTheme('light')).toBe('light')
  expect(parseTheme('dark')).toBe('dark')
  expect(parseTheme('blue')).toBeUndefined()
  expect(parseTheme(undefined)).toBeUndefined()
})
