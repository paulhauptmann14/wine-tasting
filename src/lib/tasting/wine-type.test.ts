import { expect, it } from 'vitest'
import { WINE_TYPE_KEYS, WINE_TYPE_LABELS } from './wine-type'

it('defines the wine types in display order', () => {
  expect(WINE_TYPE_KEYS).toEqual(['red', 'white', 'rose', 'sparkling'])
  expect(WINE_TYPE_KEYS.map((k) => WINE_TYPE_LABELS[k])).toEqual(['Rotwein', 'Weißwein', 'Rosé', 'Schaumwein'])
})
