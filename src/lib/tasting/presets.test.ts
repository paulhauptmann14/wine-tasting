import { describe, expect, it } from 'vitest'
import { PRESET_KEYS, PRESETS, detectPreset, matchesPreset, ratingSystemLabel } from './presets'

const rowsOf = (key: (typeof PRESET_KEYS)[number]) =>
  PRESETS[key].criteria.map((c) => `${c.name} ${c.weight}`)

it('offers a simple preset and the three common rating systems', () => {
  expect(PRESET_KEYS).toEqual(['simple', 'five', 'twenty', 'hundred'])
  expect(PRESETS.simple.scale).toBe('five')
  expect(rowsOf('simple')).toEqual(['Gesamt 1'])
})

it('weights the 5-point scheme equally (Bonvino)', () => {
  expect(PRESETS.five.scale).toBe('five')
  expect(rowsOf('five')).toEqual(['Geruch 1', 'Geschmack 1', 'Harmonie 1'])
})

it('splits the 20 points across five categories', () => {
  expect(PRESETS.twenty.scale).toBe('twenty')
  expect(rowsOf('twenty')).toEqual(['Farbe 2', 'Klarheit 2', 'Geruch 6', 'Geschmack 6', 'Gesamteindruck 4'])
})

it('uses Parker’s maximum points on top of the 50-point base', () => {
  expect(PRESETS.hundred.scale).toBe('hundred')
  expect(rowsOf('hundred')).toEqual(['Aussehen 5', 'Geruch 15', 'Geschmack 20', 'Gesamteindruck 10'])
  expect(PRESETS.hundred.criteria.reduce((sum, c) => sum + c.weight, 0)).toBe(50)
})

const asRows = (key: (typeof PRESET_KEYS)[number]) => PRESETS[key].criteria.map((c) => ({ ...c }))

describe('detecting the current rating system', () => {
  it('recognizes every preset from its scale and criteria', () => {
    for (const key of PRESET_KEYS) expect(detectPreset(PRESETS[key].scale, asRows(key))).toBe(key)
  })

  it('tells "Einfach" and the 5-point scheme apart although both use the five scale', () => {
    expect(detectPreset('five', [{ name: 'Gesamt', weight: 1 }])).toBe('simple')
    expect(detectPreset('five', asRows('five'))).toBe('five')
  })

  it('treats renamed, reweighted or added criteria as custom (order does not matter)', () => {
    expect(detectPreset('five', [{ name: 'Nase', weight: 1 }, ...asRows('five').slice(1)])).toBeNull()
    expect(detectPreset('five', [{ name: 'Geruch', weight: 2 }, ...asRows('five').slice(1)])).toBeNull()
    expect(detectPreset('five', [...asRows('five'), { name: 'Abgang', weight: 1 }])).toBeNull()
    expect(detectPreset('five', asRows('five').reverse())).toBe('five')
  })

  it('does not match a preset with the wrong scale', () => {
    expect(detectPreset('twenty', asRows('five'))).toBeNull()
    expect(matchesPreset('five', 'twenty', asRows('five'))).toBe(false)
    expect(matchesPreset('five', 'five', asRows('five'))).toBe(true)
  })

  it('names the system for display', () => {
    expect(ratingSystemLabel('hundred', asRows('hundred'))).toBe('100-Punkte-Schema')
    expect(ratingSystemLabel('five', asRows('simple'))).toBe('Einfach')
    expect(ratingSystemLabel('twenty', [{ name: 'Eigen', weight: 1 }])).toBe('Eigene Kriterien (20-Punkte-Skala)')
    expect(ratingSystemLabel('five', [])).toBe('Eigene Kriterien (5-Punkte-Skala)')
  })
})
