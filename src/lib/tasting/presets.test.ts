import { expect, it } from 'vitest'
import { PRESET_KEYS, PRESETS } from './presets'

const describe = (key: (typeof PRESET_KEYS)[number]) =>
  PRESETS[key].criteria.map((c) => `${c.name} ${c.weight}`)

it('offers a simple preset and the three common rating systems', () => {
  expect(PRESET_KEYS).toEqual(['simple', 'five', 'twenty', 'hundred'])
  expect(PRESETS.simple.scale).toBe('five')
  expect(describe('simple')).toEqual(['Gesamt 1'])
})

it('weights the 5-point scheme equally (Bonvino)', () => {
  expect(PRESETS.five.scale).toBe('five')
  expect(describe('five')).toEqual(['Geruch 1', 'Geschmack 1', 'Harmonie 1'])
})

it('splits the 20 points across five categories', () => {
  expect(PRESETS.twenty.scale).toBe('twenty')
  expect(describe('twenty')).toEqual(['Farbe 2', 'Klarheit 2', 'Geruch 6', 'Geschmack 6', 'Gesamteindruck 4'])
})

it('uses Parker’s maximum points on top of the 50-point base', () => {
  expect(PRESETS.hundred.scale).toBe('hundred')
  expect(describe('hundred')).toEqual(['Aussehen 5', 'Geruch 15', 'Geschmack 20', 'Gesamteindruck 10'])
  expect(PRESETS.hundred.criteria.reduce((sum, c) => sum + c.weight, 0)).toBe(50)
})
