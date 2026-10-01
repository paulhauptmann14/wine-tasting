import { expect, it } from 'vitest'
import { PRESET_KEYS, PRESETS } from './presets'

it('defines the three presets from the spec', () => {
  expect(PRESET_KEYS).toEqual(['simple', 'classic', 'detailed'])
  expect(PRESETS.simple.criteria).toEqual(['Gesamt'])
  expect(PRESETS.classic.criteria).toEqual(['Aussehen', 'Aroma', 'Geschmack', 'Gesamt'])
  expect(PRESETS.detailed.criteria).toEqual([
    'Aussehen', 'Aroma', 'Geschmack', 'Säure', 'Süße', 'Körper', 'Abgang', 'Gesamt',
  ])
  expect(PRESETS.classic.label).toBe('Classic')
})
