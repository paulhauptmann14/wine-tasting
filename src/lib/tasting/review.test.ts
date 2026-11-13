import { describe, expect, it } from 'vitest'
import { computeResults, type ResultsInput } from './results'
import { computeReview } from './review'

const criteria = [
  { id: 'c1', name: 'Aroma', position: 1, weight: 1 },
  { id: 'c2', name: 'Geschmack', position: 2, weight: 1 },
  { id: 'c3', name: 'Gesamt', position: 3, weight: 1 },
]
const wine = (id: string, position: number, name: string) => ({
  id, position, name, winery: null, vintage: null, grapeVariety: null, sweetness: null, wineType: null, description: null, alcohol: null,
})
const wines = [wine('a', 1, 'A'), wine('b', 2, 'B'), wine('c', 3, 'C'), wine('d', 4, 'D')]
const rate = (participantId: string, wineId: string, stars: number) => ({
  participantId, wineId, values: { c1: stars, c2: stars, c3: stars },
})

function review(ratings: ResultsInput['ratings'], viewerId: string | null = 'me', wineList = wines) {
  const input = { wines: wineList, criteria, ratings }
  return computeReview(input, computeResults({ ...input, revealNames: true }), viewerId)
}

describe('computeReview', () => {
  it('compares own score with the mean of the others', () => {
    const r = review([rate('me', 'a', 5), rate('p2', 'a', 3), rate('p3', 'a', 4)])
    expect(r?.personal?.rows[0]).toEqual({ position: 1, name: 'A', mine: 5, others: 3.5 })
  })

  it('marks only differences of at least one star', () => {
    const up = review([rate('me', 'a', 5), rate('p2', 'a', 3), rate('p3', 'a', 4)])
    expect(up?.personal?.above).toEqual({ position: 1, name: 'A', mine: 5, others: 3.5 })
    const down = review([rate('me', 'a', 3), rate('p2', 'a', 3), rate('p3', 'a', 4)])
    expect(down?.personal?.below).toBeNull()
    expect(down?.personal?.above).toBeNull()
  })

  it('marks the wine liked less than the others', () => {
    const r = review([rate('me', 'a', 2), rate('p2', 'a', 4), rate('me', 'b', 3), rate('p2', 'b', 3.5)])
    expect(r?.personal?.below?.name).toBe('A')
  })

  it('ignores incomplete ratings', () => {
    const r = review([
      rate('me', 'a', 4),
      { participantId: 'me', wineId: 'b', values: { c1: 5, c2: 5 } },
      rate('p2', 'b', 2),
      rate('p2', 'a', 3),
    ])
    expect(r?.personal?.rows.map((row) => row.name)).toEqual(['A'])
  })

  it('shows "only you" as others = null and never highlights it', () => {
    const r = review([rate('me', 'c', 5)])
    expect(r?.personal?.rows[0]).toEqual({ position: 3, name: 'C', mine: 5, others: null })
    expect(r?.personal?.above).toBeNull()
    expect(r?.personal?.below).toBeNull()
  })

  it('favorite tie goes to the better group rank', () => {
    const r = review([rate('me', 'a', 5), rate('me', 'd', 5), rate('p2', 'a', 2), rate('p2', 'd', 4)])
    expect(r?.personal?.favorite).toEqual({ name: 'D', groupRank: 1 })
  })

  it('controversial and consensus need three ratings and two wines', () => {
    const one = review([rate('me', 'a', 1), rate('p2', 'a', 3), rate('p3', 'a', 5)], null)
    expect(one).toBeNull()
    const two = review([
      rate('me', 'a', 1), rate('p2', 'a', 3), rate('p3', 'a', 5),
      rate('me', 'b', 4), rate('p2', 'b', 4), rate('p3', 'b', 4),
    ], null)
    expect(two?.controversial).toEqual({ position: 1, name: 'A', min: 1, max: 5 })
    expect(two?.consensus).toEqual({ position: 2, name: 'B', min: 4, max: 4 })
  })

  it('never names the same wine as controversial and consensus', () => {
    const r = review([
      rate('me', 'a', 2), rate('p2', 'a', 3), rate('p3', 'a', 4),
      rate('me', 'b', 2), rate('p2', 'b', 3), rate('p3', 'b', 4),
    ], null)
    expect(r).toBeNull()
  })

  it('viewer without ratings gets only the group part', () => {
    const r = review([
      rate('p2', 'a', 1), rate('p3', 'a', 5), rate('p4', 'a', 3),
      rate('p2', 'b', 4), rate('p3', 'b', 4), rate('p4', 'b', 4),
    ])
    expect(r?.personal).toBeNull()
    expect(r?.controversial?.name).toBe('A')
    expect(r?.consensus?.name).toBe('B')
  })

  it('returns null when there is nothing to say', () => {
    expect(review([], 'me', [wine('a', 1, 'A')])).toBeNull()
    expect(review([{ participantId: 'me', wineId: 'a', values: { c1: 4 } }], 'me', [wine('a', 1, 'A')])).toBeNull()
  })

  it('leaks no participant ids', () => {
    const r = review([rate('me', 'a', 5), rate('p2', 'a', 3), rate('p3', 'a', 4), rate('p2', 'b', 1), rate('p3', 'b', 5), rate('me', 'b', 3)])
    const json = JSON.stringify(r)
    expect(json).not.toContain('p2')
    expect(json).not.toContain('p3')
  })

  it('is blind-safe: no real wine name when the results are redacted', () => {
    const named = [wine('a', 1, 'Riesling'), wine('b', 2, 'Merlot'), wine('c', 3, 'Silvaner')]
    const ratings = [
      rate('me', 'a', 5), rate('p2', 'a', 1), rate('p3', 'a', 3),
      rate('me', 'b', 3), rate('p2', 'b', 3), rate('p3', 'b', 3),
      rate('me', 'c', 1), rate('p2', 'c', 4), rate('p3', 'c', 4),
    ]
    const input = { wines: named, criteria, ratings }
    const r = computeReview(input, computeResults({ ...input, revealNames: false }), 'me')
    const json = JSON.stringify(r)
    expect(json).not.toMatch(/Riesling|Merlot|Silvaner/)
    expect(r?.personal?.rows.map((row) => row.name)).toEqual(['Wein #1', 'Wein #2', 'Wein #3'])
    expect(r?.personal?.favorite.name).toBe('Wein #1')
    expect(r?.controversial?.name).toMatch(/^Wein #\d$/)
    expect(r?.consensus?.name).toMatch(/^Wein #\d$/)
  })
})
