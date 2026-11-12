import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { GRAPES } from './dictionaries'
import { parseAppellations, parseSites, parseWineries, type Appellation } from './reference-data'

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

describe('parseAppellations: grapes', () => {
  it('keeps typical grapes, the main grape and sources', () => {
    expect(
      parseAppellations([
        {
          name: 'Barolo',
          country: 'IT',
          wineType: 'red',
          grapes: ['Nebbiolo'],
          mainGrape: 'Nebbiolo',
          sources: ['https://example.org/disciplinare.pdf'],
        },
        { name: 'Rioja', country: 'ES', grapes: ['Tempranillo', ' ', 3, 'Garnacha', 'Tempranillo'] },
      ]),
    ).toEqual([
      {
        name: 'Barolo',
        country: 'IT',
        wineType: 'red',
        grapes: ['Nebbiolo'],
        mainGrape: 'Nebbiolo',
        sources: ['https://example.org/disciplinare.pdf'],
      },
      { name: 'Rioja', country: 'ES', grapes: ['Tempranillo', 'Garnacha'] },
    ])
  })

  it('drops a main grape that is not the first typical grape', () => {
    expect(parseAppellations([{ name: 'X', country: 'IT', grapes: ['Barbera', 'Nebbiolo'], mainGrape: 'Nebbiolo' }])).toEqual([
      { name: 'X', country: 'IT', grapes: ['Barbera', 'Nebbiolo'] },
    ])
  })

  it('takes a main grape without typical grapes as the only one', () => {
    expect(parseAppellations([{ name: 'Chablis', country: 'FR', mainGrape: 'Chardonnay' }])).toEqual([
      { name: 'Chablis', country: 'FR', grapes: ['Chardonnay'], mainGrape: 'Chardonnay' },
    ])
  })

  it('ignores grape fields of the wrong shape', () => {
    expect(parseAppellations([{ name: 'X', country: 'IT', grapes: 'Nebbiolo', mainGrape: 7, sources: 'url' }])).toEqual([
      { name: 'X', country: 'IT' },
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

// The generated list itself (scripts/build-reference-data.mjs): the rules the label scan relies on.
describe('public/data/appellations.json', () => {
  const raw: unknown[] = JSON.parse(readFileSync('public/data/appellations.json', 'utf8'))
  const list = parseAppellations(raw)
  const colour = new Map(GRAPES.map((g) => [g.canonical, g.colour]))
  const find = (country: string, name: string) => list.find((a) => a.country === country && a.name === name) as Appellation

  it('parses every entry', () => {
    expect(list).toHaveLength(raw.length)
  })

  it('only names grapes of the dictionary', () => {
    const unknown = list.flatMap((a) => (a.grapes ?? []).filter((g) => !colour.has(g)))
    expect(unknown).toEqual([])
  })

  it('keeps a main grape only as the first grape and with its source', () => {
    for (const a of list.filter((x) => x.mainGrape)) {
      expect(a.grapes?.[0], a.name).toBe(a.mainGrape)
      expect(a.sources?.length, a.name).toBeGreaterThan(0)
    }
  })

  it('gives a one-colour appellation a main grape of that colour', () => {
    for (const a of list.filter((x) => x.mainGrape && x.wineType && x.wineType !== 'sparkling')) {
      expect(colour.get(a.mainGrape!), a.name).toBe(a.wineType === 'white' ? 'white' : 'red')
    }
  })

  it('fills the grape only where the rules require 85 % of it', () => {
    expect(find('IT', 'Barolo')).toMatchObject({ wineType: 'red', mainGrape: 'Nebbiolo' })
    expect(find('IT', 'Brunello di Montalcino')).toMatchObject({ wineType: 'red', mainGrape: 'Sangiovese' })
    expect(find('IT', 'Prosecco')).toMatchObject({ wineType: 'sparkling', mainGrape: 'Glera' })
    expect(find('FR', 'Chablis')).toMatchObject({ wineType: 'white', mainGrape: 'Chardonnay' })
    expect(find('FR', 'Morgon')).toMatchObject({ wineType: 'red', mainGrape: 'Gamay' })
    // Sancerre: white Sauvignon Blanc, red and rosé Pinot Noir – the colour decides, not the name
    expect(find('FR', 'Sancerre')).toMatchObject({ mainGrape: 'Sauvignon Blanc', grapes: ['Sauvignon Blanc', 'Spätburgunder'] })
    expect(find('FR', 'Sancerre').wineType).toBeUndefined()
    // Blends and < 85 %: typical grapes only
    for (const [country, name, first] of [
      ['IT', 'Chianti', 'Sangiovese'],
      ['IT', 'Vino Nobile di Montepulciano', 'Sangiovese'],
      ['IT', 'Amarone della Valpolicella', 'Corvina'],
      ['IT', 'Asti', 'Muskateller'],
      ['ES', 'Rioja', 'Tempranillo'],
      ['ES', 'Ribera del Duero', 'Tempranillo'],
      ['FR', 'Champagne', 'Chardonnay'],
      ['FR', 'Bourgogne', 'Spätburgunder'],
    ]) {
      expect(find(country, name).grapes?.[0], name).toBe(first)
      expect(find(country, name).mainGrape, name).toBeUndefined()
    }
  })

  it('types DOPs made only as sparkling wine, not a town of the same name', () => {
    for (const name of ['Vernaccia di Serrapetrona', 'Lambrusco di Sorbara', 'Lambrusco Grasparossa di Castelvetro', 'Lambrusco Salamino di Santa Croce']) {
      expect(find('IT', name).wineType, name).toBe('sparkling')
    }
    // Trento DOC is sparkling, but "Trento" on a label is mostly the town or province
    expect(find('IT', 'Trento').wineType).toBeUndefined()
  })

  it('has no main grape where a wine of the same colour may be made from another grape', () => {
    // Salice Salentino rosso: Negroamaro ≥ 85 %, but "Salice Salentino Aleatico" (also red): Aleatico
    expect(find('IT', 'Salice Salentino').mainGrape).toBeUndefined()
    expect(find('IT', 'Salice Salentino').grapes?.[0]).toBe('Negroamaro')
  })

  it('links each Italian rule to the appellation’s own entry in eAmbrosia', () => {
    const italian = list.filter((a) => a.country === 'IT' && a.sources)
    expect(italian.length).toBeGreaterThan(100)
    for (const a of italian) {
      expect(a.sources, a.name).toEqual([expect.stringMatching(/^https:\/\/ec\.europa\.eu\/agriculture\/eambrosia\/geographical-indications-register\/details\/EUGI\d+$/)])
    }
    expect(find('IT', 'Barolo').sources).not.toEqual(find('IT', 'Barbaresco').sources)
  })

  it('gives no type to appellations of several colours', () => {
    for (const [country, name] of [
      ['FR', 'Sancerre'],
      ['FR', 'Bourgogne'],
      ['ES', 'Rioja'],
      ['IT', 'Lambrusco Mantovano'],
      ['IT', 'Salice Salentino'],
      ['IT', 'Etna'],
    ]) {
      expect(find(country, name).wineType, name).toBeUndefined()
    }
  })
})
