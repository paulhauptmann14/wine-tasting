import { expect, it } from 'vitest'
import { moveInOrder } from './order'

it('swaps with the neighbour in the given direction', () => {
  expect(moveInOrder(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c'])
  expect(moveInOrder(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b'])
})

it('returns null at the edges and for unknown ids', () => {
  expect(moveInOrder(['a', 'b'], 'a', 'up')).toBeNull()
  expect(moveInOrder(['a', 'b'], 'b', 'down')).toBeNull()
  expect(moveInOrder(['a', 'b'], 'x', 'up')).toBeNull()
})
