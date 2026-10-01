import { expect, it } from 'vitest'
import { wineTitle } from './display'

const wine = { position: 2, name: 'Riesling Kabinett', vintage: 2022, grapeVariety: 'Riesling' }

it('uses the number when names are hidden', () => {
  expect(wineTitle(wine, false)).toEqual({ title: 'Wein #2', subtitle: null })
})

it('uses name, vintage and grape when shown', () => {
  expect(wineTitle(wine, true)).toEqual({ title: 'Riesling Kabinett', subtitle: '2022 · Riesling' })
  expect(wineTitle({ ...wine, vintage: null, grapeVariety: null }, true).subtitle).toBeNull()
})
