import { expect, it } from 'vitest'
import { wineDetails, wineTitle } from './display'

const wine = { position: 2, name: 'Riesling Kabinett', vintage: 2022, grapeVariety: 'Riesling', sweetness: 'dry' as const, wineType: 'white' as const }

it('uses the number when names are hidden', () => {
  expect(wineTitle(wine, false)).toEqual({ title: 'Wein #2', subtitle: null })
})

it('uses name, vintage and grape when shown', () => {
  expect(wineTitle(wine, true)).toEqual({ title: 'Riesling Kabinett', subtitle: 'Weißwein · 2022 · Riesling · trocken' })
  expect(wineTitle({ ...wine, vintage: null, grapeVariety: null, sweetness: null, wineType: null }, true).subtitle).toBeNull()
})

it('joins only the details that are set', () => {
  expect(wineDetails({ vintage: null, grapeVariety: null, sweetness: 'sweet', wineType: null })).toBe('süß')
  expect(wineDetails({ vintage: 2019, grapeVariety: null, sweetness: null, wineType: 'red' })).toBe('Rotwein · 2019')
})
