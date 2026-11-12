import { describe, expect, it } from 'vitest'
import { parseAppellations, parseSites, parseWineries } from './reference-data'

describe('parseWineries', () => {
  it('keeps non-empty strings and drops everything else', () => {
    expect(parseWineries(['Weingut Lindenhof', '', 42, null, '  Domaine X  '])).toEqual(['Weingut Lindenhof', 'Domaine X'])
  })
  it('returns an empty list for non-arrays', () => {
    expect(parseWineries({ a: 1 })).toEqual([])
    expect(parseWineries(null)).toEqual([])
  })
})

describe('parseAppellations', () => {
  it('keeps valid entries and ignores unknown wine types', () => {
    expect(
      parseAppellations([
        { name: 'Prosecco', country: 'IT', wineType: 'sparkling' },
        { name: 'Rioja', country: 'ES' },
        { name: 'Foo', country: 'XX', wineType: 'orange' },
        { country: 'DE' },
        'Bar',
      ]),
    ).toEqual([
      { name: 'Prosecco', country: 'IT', wineType: 'sparkling' },
      { name: 'Rioja', country: 'ES' },
      { name: 'Foo', country: 'XX' },
    ])
  })
})

describe('parseSites', () => {
  it('keeps name and region, village is optional', () => {
    expect(
      parseSites([
        { name: 'Kupp', village: 'Serrig', region: 'Mosel' },
        { name: 'Ried', region: 'Niederösterreich' },
        { name: 'Ohne Region' },
        null,
      ]),
    ).toEqual([
      { name: 'Kupp', village: 'Serrig', region: 'Mosel' },
      { name: 'Ried', region: 'Niederösterreich' },
    ])
  })
})
