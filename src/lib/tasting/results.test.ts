import { describe, expect, it } from 'vitest'
import { computeResults, formatScore, type ResultsInput } from './results'

const wine = (id: string, position: number, name = `Wein ${id}`) => ({
  id, position, name, vintage: 2020 + position, grapeVariety: 'Riesling',
})
const criteria = [
  { id: 'c1', name: 'Aroma', position: 1 },
  { id: 'c2', name: 'Gesamt', position: 2 },
]

function input(partial: Partial<ResultsInput>): ResultsInput {
  return { wines: [], criteria, ratings: [], revealNames: false, ...partial }
}

describe('computeResults', () => {
  it('averages per person first, then across people', () => {
    const r = computeResults(input({
      wines: [wine('a', 1)],
      ratings: [
        { participantId: 'p1', wineId: 'a', values: { c1: 4, c2: 5 } },
        { participantId: 'p2', wineId: 'a', values: { c1: 3, c2: 3 } },
      ],
    }))
    expect(r.wines[0].score).toBeCloseTo(3.75)
    expect(r.wines[0].criterionAverages).toEqual({ c1: 3.5, c2: 4 })
    expect(r.wines[0].ratingCount).toBe(2)
  })

  it('ignores incomplete ratings', () => {
    const r = computeResults(input({
      wines: [wine('a', 1)],
      ratings: [
        { participantId: 'p1', wineId: 'a', values: { c1: 5 } },
        { participantId: 'p2', wineId: 'a', values: { c1: 2, c2: 2 } },
      ],
    }))
    expect(r.wines[0].score).toBe(2)
    expect(r.wines[0].ratingCount).toBe(1)
  })

  it('ranks with shared ranks on ties and unrated wines last', () => {
    const r = computeResults(input({
      wines: [wine('a', 1), wine('b', 2), wine('c', 3), wine('d', 4)],
      ratings: [
        { participantId: 'p1', wineId: 'a', values: { c1: 3, c2: 3 } },
        { participantId: 'p1', wineId: 'b', values: { c1: 4, c2: 4 } },
        { participantId: 'p1', wineId: 'c', values: { c1: 4, c2: 4 } },
      ],
    }))
    expect(r.wines.map((w) => [w.position, w.rank])).toEqual([[2, 1], [3, 1], [1, 3], [4, null]])
    expect(r.wines[3].score).toBeNull()
  })

  it('hides names unless revealed', () => {
    const hidden = computeResults(input({ wines: [wine('a', 1, 'Riesling')] }))
    expect(hidden.wines[0]).toMatchObject({ label: 'Wein #1', name: null, vintage: null, grapeVariety: null })
    const shown = computeResults(input({ wines: [wine('a', 1, 'Riesling')], revealNames: true }))
    expect(shown.wines[0]).toMatchObject({ name: 'Riesling', vintage: 2021, grapeVariety: 'Riesling' })
  })

  it('returns criteria sorted by position', () => {
    const r = computeResults(input({ criteria: [criteria[1], criteria[0]] }))
    expect(r.criteria.map((c) => c.name)).toEqual(['Aroma', 'Gesamt'])
  })
})

describe('formatScore', () => {
  it('uses German decimal comma with one digit', () => {
    expect(formatScore(4.55)).toBe('4,6')
    expect(formatScore(4)).toBe('4,0')
    expect(formatScore(null)).toBe('–')
  })
})
