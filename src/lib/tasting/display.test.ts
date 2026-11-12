import { expect, it } from 'vitest'
import { wineDetails, wineTitle } from './display'

const wine = {
  position: 2, name: 'Riesling Kabinett', winery: null, vintage: 2022, grapeVariety: 'Riesling', sweetness: 'dry' as const, wineType: 'white' as const,
  description: null,
  alcohol: null as number | null,
}

it('uses the number when names are hidden', () => {
  expect(wineTitle(wine, false)).toEqual({ title: 'Wein #2', subtitle: null, description: null })
})

it('uses name, vintage and grape when shown', () => {
  expect(wineTitle(wine, true)).toEqual({ title: 'Riesling Kabinett', subtitle: 'Weißwein · 2022 · Riesling · trocken', description: null })
  expect(wineTitle({ ...wine, winery: null, vintage: null, grapeVariety: null, sweetness: null, wineType: null }, true).subtitle).toBeNull()
})

it('joins only the details that are set', () => {
  const none = { winery: null, vintage: null, grapeVariety: null, sweetness: null, wineType: null, description: null, alcohol: null }
  expect(wineDetails({ ...none, sweetness: 'sweet' })).toBe('süß')
  expect(wineDetails({ ...none, vintage: 2019, wineType: 'red' })).toBe('Rotwein · 2019')
})

it('puts the alcohol last, as on the label', () => {
  expect(wineDetails({ ...wine, alcohol: 12.5 })).toBe('Weißwein · 2022 · Riesling · trocken · 12,5 % vol')
  expect(wineTitle({ ...wine, alcohol: 12.5 }, false).subtitle).toBeNull()
})

it('puts the winery first', () => {
  const withWinery = { ...wine, winery: 'Weingut Dr. Loosen' }
  expect(wineDetails(withWinery)).toBe('Weingut Dr. Loosen · Weißwein · 2022 · Riesling · trocken')
  expect(wineDetails({ ...withWinery, vintage: null, grapeVariety: null, sweetness: null, wineType: null })).toBe('Weingut Dr. Loosen')
  expect(wineTitle(withWinery, true)).toEqual({
    title: 'Riesling Kabinett',
    subtitle: 'Weingut Dr. Loosen · Weißwein · 2022 · Riesling · trocken',
    description: null,
  })
})

it('keeps the description out of the details line and returns it on its own', () => {
  const described = { ...wine, description: 'Süß & fruchtig' }
  // The details line also goes onto the share image, the description does not
  expect(wineDetails(described)).toBe('Weißwein · 2022 · Riesling · trocken')
  expect(wineTitle(described, true).description).toBe('Süß & fruchtig')
  expect(wineTitle({ ...described, description: '' }, true).description).toBeNull()
})

it('never shows the description when names are hidden', () => {
  const blind = wineTitle({ ...wine, description: 'Noten von Kirsche' }, false)
  expect(blind.description).toBeNull()
  expect(JSON.stringify(blind)).not.toContain('Kirsche')
})

it('never shows the winery when names are hidden', () => {
  const blind = wineTitle({ ...wine, winery: 'Weingut Dr. Loosen' }, false)
  expect(JSON.stringify(blind)).not.toContain('Loosen')
})
