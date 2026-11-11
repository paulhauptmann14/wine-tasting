import { describe, expect, it } from 'vitest'
import { moveInOrder, shuffleUnrated } from './order'

it('swaps with the neighbour in the given direction', () => {
  expect(moveInOrder(['a', 'b', 'c'], 'b', 'up')).toEqual(['b', 'a', 'c'])
  expect(moveInOrder(['a', 'b', 'c'], 'b', 'down')).toEqual(['a', 'c', 'b'])
})

it('returns null at the edges and for unknown ids', () => {
  expect(moveInOrder(['a', 'b'], 'a', 'up')).toBeNull()
  expect(moveInOrder(['a', 'b'], 'b', 'down')).toBeNull()
  expect(moveInOrder(['a', 'b'], 'x', 'up')).toBeNull()
})

describe('shuffleUnrated', () => {
  const wines = (spec: string) =>
    spec.split(' ').map((s) => ({ id: s.replace('*', ''), rated: s.endsWith('*') }))
  /** Always picks index 0. */
  const lowest = () => 0
  /** Always picks the highest index – Fisher–Yates then leaves the order untouched. */
  const highest = (max: number) => max - 1
  const sequence = (values: number[]) => {
    let i = 0
    return (max: number) => values[i++ % values.length] % max
  }

  it('permutes unrated wines among their own positions and keeps rated ones fixed', () => {
    const result = shuffleUnrated(wines('a b* c d e*'), lowest)!
    expect(result).toHaveLength(5)
    expect(result[1]).toBe('b')
    expect(result[4]).toBe('e')
    expect([result[0], result[2], result[3]].sort()).toEqual(['a', 'c', 'd'])
    expect(result).not.toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('is deterministic for a given random function', () => {
    const a = shuffleUnrated(wines('a b c d'), sequence([1, 0, 2]))
    const b = shuffleUnrated(wines('a b c d'), sequence([1, 0, 2]))
    expect(a).toEqual(b)
  })

  it('never returns the original order when at least two wines are unrated', () => {
    // `highest` would keep the order – the function has to produce something else anyway
    for (const spec of ['a b', 'a b c', 'a* b c', 'a b* c d']) {
      const input = wines(spec)
      const result = shuffleUnrated(input, highest)!
      expect(result, spec).not.toEqual(input.map((w) => w.id))
      expect([...result].sort(), spec).toEqual(input.map((w) => w.id).sort())
    }
  })

  it('returns null with fewer than two unrated wines', () => {
    expect(shuffleUnrated(wines('a'), lowest)).toBeNull()
    expect(shuffleUnrated(wines('a b* c*'), lowest)).toBeNull()
    expect(shuffleUnrated(wines('a* b*'), lowest)).toBeNull()
    expect(shuffleUnrated([], lowest)).toBeNull()
  })

  it('reaches every other permutation with a real random source', () => {
    const seen = new Set<string>()
    for (let i = 0; i < 400; i++) {
      seen.add(shuffleUnrated(wines('a b c'), (max) => Math.floor(Math.random() * max))!.join(''))
    }
    // 3! = 6 permutations, minus the identity
    expect(seen.size).toBe(5)
  })
})
