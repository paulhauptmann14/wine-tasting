import { expect, it } from 'vitest'
import { ratingState } from './progress'

it('is open without a rating, done with a value for every criterion, incomplete otherwise', () => {
  expect(ratingState(undefined, 3)).toBe('open')
  expect(ratingState(0, 3)).toBe('incomplete')
  expect(ratingState(2, 3)).toBe('incomplete')
  expect(ratingState(3, 3)).toBe('done')
})
