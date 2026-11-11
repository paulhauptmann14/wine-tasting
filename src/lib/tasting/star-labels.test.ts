import { expect, it } from 'vitest'
import { starLabel } from './star-labels'

it('names every step of the 1–5 star scale', () => {
  expect([1, 2, 3, 4, 5].map((n) => starLabel(n, 1, 5))).toEqual([
    'schwach',
    'befriedigend',
    'gut',
    'sehr gut',
    'ausgezeichnet',
  ])
})

it('has no label for unset values or other scales', () => {
  expect(starLabel(null, 1, 5)).toBeNull()
  expect(starLabel(3, 1, 10)).toBeNull()
})
