import { describe, expect, it } from 'vitest'
import { PRESETS } from './presets'
import { formatPoints, scoring } from './scoring'

describe('scoring', () => {
  it('gives each criterion its maximum points on the 100-point scale', () => {
    const s = scoring('hundred', PRESETS.hundred.criteria)
    expect(s).toMatchObject({ max: 100, base: 50, equalWeights: false })
    expect(s.criteria.map((c) => [c.name, c.points])).toEqual([
      ['Aussehen', 5], ['Geruch', 15], ['Geschmack', 20], ['Gesamteindruck', 10],
    ])
  })

  it('splits 20 points across the 20-point criteria', () => {
    const s = scoring('twenty', PRESETS.twenty.criteria)
    expect(s.criteria.reduce((sum, c) => sum + c.points, 0)).toBe(20)
    expect(s.base).toBe(0)
  })

  it('rescales when the host adds a criterion', () => {
    const s = scoring('hundred', [...PRESETS.hundred.criteria, { name: 'Abgang', weight: 10 }])
    expect(s.criteria.reduce((sum, c) => sum + c.points, 0)).toBeCloseTo(50)
    expect(s.criteria.find((c) => c.name === 'Geschmack')?.points).toBeCloseTo(50 / 3)
  })

  it('shares the 5-point scale equally by default', () => {
    const s = scoring('five', PRESETS.five.criteria)
    expect(s.equalWeights).toBe(true)
    expect(s.criteria.map((c) => c.share)).toEqual([1 / 3, 1 / 3, 1 / 3])
  })
})

it('formats points with at most one decimal', () => {
  expect(formatPoints(20)).toBe('20')
  expect(formatPoints(16.666)).toBe('16,7')
})
