// The approved criteria for wine type and grape (see "criteria" in parse-label.ts): which evidence
// fills a field (sure) and which is only offered as a suggestion. Appellations are hand-written
// fixtures in the agreed format of public/data/appellations.json.
import { describe, expect, it } from 'vitest'
import { parseLabel } from './parse-label'
import { planPrefill } from './prefill'
import { GRAPES, ORIGIN_GRAPE_NAMES } from './dictionaries'
import type { AppellationRef } from './match-reference'
import { stack, type LineSpec } from './test-lines'

const appellations: AppellationRef[] = [
  { name: 'Barolo', country: 'IT', wineType: 'red', grapes: ['Nebbiolo'], mainGrape: 'Nebbiolo' },
  { name: 'Chablis', country: 'FR', wineType: 'white', grapes: ['Chardonnay'], mainGrape: 'Chardonnay' },
  // Both colours: white is Sauvignon Blanc, red and rosé Pinot Noir
  { name: 'Sancerre', country: 'FR', grapes: ['Sauvignon Blanc', 'Spätburgunder'], mainGrape: 'Sauvignon Blanc' },
  { name: 'Rioja', country: 'ES', grapes: ['Tempranillo', 'Grenache', 'Graciano', 'Carignan', 'Macabeo'] },
  { name: 'Bordeaux', country: 'FR', grapes: ['Merlot', 'Cabernet Sauvignon', 'Cabernet Franc'] },
  { name: 'Bolgheri', country: 'IT', grapes: ['Cabernet Sauvignon', 'Merlot', 'Cabernet Franc', 'Syrah'] },
  { name: 'Prosecco', country: 'IT', wineType: 'sparkling', grapes: ['Glera', 'Chardonnay'] },
  { name: 'Langhe', country: 'IT', grapes: ['Nebbiolo', 'Dolcetto', 'Barbera'] },
  { name: 'Pfalz', country: 'DE' },
  { name: 'Crémant de Bourgogne', country: 'FR', wineType: 'sparkling', grapes: ['Chardonnay', 'Spätburgunder'] },
  // One-word names that are also towns
  { name: 'Dogliani', country: 'IT', wineType: 'red' },
  { name: 'Aversa', country: 'IT', wineType: 'white' },
  { name: 'Asti', country: 'IT', wineType: 'sparkling', grapes: ['Muskateller'] },
  { name: 'Carmignano', country: 'IT', wineType: 'red' },
  // Longer names that contain one of them
  { name: "Barbera d'Asti", country: 'IT', wineType: 'red', grapes: ['Barbera'], mainGrape: 'Barbera' },
  { name: 'Vin Santo di Carmignano', country: 'IT' },
  { name: 'Montrachet', country: 'FR', wineType: 'white' },
  { name: 'Chassagne-Montrachet', country: 'FR', grapes: ['Chardonnay', 'Spätburgunder'] },
]

const parse = (specs: LineSpec[]) => parseLabel(stack(specs), { currentYear: 2026, appellations })

describe('wine type: "Blanc de Noirs" and "Blanc de Blancs"', () => {
  it('is white and sure, also over a red grape; the grape stays as printed', () => {
    const result = parse([['Weingut Kranz', 30], ['Blanc de Noirs', 24], ['Spätburgunder', 18], ['trocken', 14]])
    expect(result.wineType).toEqual({ value: 'white', sure: true })
    expect(result.grapeVariety).toEqual({ value: 'Spätburgunder', sure: true })
  })

  it.each([['BLANC DE NOIR'], ['Blanc-de-Noirs'], ['blanc de noirs'], ['BLANC DE BLANCS'], ['Blanc de Blanc'], ['BLANC DE N0IRS']])(
    'reads %s as white',
    (text) => {
      expect(parse([['Hausmarke', 40], [text, 20], ['Pinot Noir', 14]]).wineType).toEqual({ value: 'white', sure: true })
    },
  )

  it('wins over a red-only appellation', () => {
    expect(parse([['BAROLO', 40], ['Blanc de Noirs', 20]]).wineType).toEqual({ value: 'white', sure: true })
  })

  it('stays sparkling on a sparkling label', () => {
    expect(parse([['Winzersekt', 30], ['Blanc de Noirs', 20], ['brut', 14]]).wineType).toEqual({ value: 'sparkling', sure: true })
    expect(parse([['CRÉMANT DE BOURGOGNE', 30], ['BLANC DE BLANCS', 20]]).wineType).toEqual({ value: 'sparkling', sure: true })
  })

  it('is only a suggestion when read poorly', () => {
    expect(parse([['Hausmarke', 40], ['Blanc de Noirs', 20, 60], ['Spätburgunder', 14]]).wineType).toEqual({ value: 'white', sure: false })
  })

  it('does not take the white main grape of the appellation for a "Blanc de Noirs"', () => {
    // White wine, but from red grapes: Sauvignon Blanc would be wrong
    const noirs = parse([['Domaine Laroche', 30], ['SANCERRE', 40], ['Blanc de Noirs', 20]])
    expect(noirs.wineType).toEqual({ value: 'white', sure: true })
    expect(noirs.grapeVariety).toBeUndefined()
    expect(noirs.grapeCandidates).toEqual(['Pinot Noir'])
    // "Blanc de Blancs" is made from white grapes: the main grape applies
    const blancs = parse([['Domaine Laroche', 30], ['SANCERRE', 40], ['Blanc de Blancs', 20]])
    expect(blancs.grapeVariety).toEqual({ value: 'Sauvignon Blanc', sure: true, from: 'origin' })
  })

  it('does not filter the appellation grapes by a poorly read "Blanc de …"', () => {
    const result = parse([['Domaine Laroche', 30], ['SANCERRE', 40], ['Blanc de Noirs', 20, 60]])
    expect(result.grapeVariety).toBeUndefined()
    expect(result.grapeCandidates).toEqual(['Sauvignon Blanc', 'Pinot Noir'])
  })
})

describe('wine type: appellation that allows one colour', () => {
  it('is sure for a clearly read appellation', () => {
    expect(parse([['Domaine Laroche', 30], ['CHABLIS', 40]]).wineType).toEqual({ value: 'white', sure: true, from: 'origin' })
    expect(parse([['BAROLO', 40], ['DOCG', 14]]).wineType).toEqual({ value: 'red', sure: true, from: 'origin' })
  })

  it('is only a suggestion when the appellation is read poorly', () => {
    expect(parse([['Hausmarke', 40], ['CHABLIS', 30, 60]]).wineType).toEqual({ value: 'white', sure: false, from: 'origin' })
    // One letter off is fine when the appellation fills the line, not inside a longer line
    expect(parse([['Hausmarke', 40], ['CHABLES', 30]]).wineType).toEqual({ value: 'white', sure: true, from: 'origin' })
    expect(parse([['Hausmarke', 40], ['Cuvée Chables Réserve Spéciale', 20]]).wineType).toEqual({ value: 'white', sure: false, from: 'origin' })
    expect(parse([['Hausmarke', 40], ['Chablis Premier Cru Vaillons', 20]]).wineType).toEqual({ value: 'white', sure: true, from: 'origin' })
  })

  it('lets a printed type word win', () => {
    expect(parse([['CHABLIS', 40], ['Vin Rouge', 20]]).wineType).toEqual({ value: 'red', sure: true })
    // Even a poorly read one: conflicting evidence gives no sure value
    expect(parse([['CHABLIS', 40], ['Vin Rouge', 20, 60]]).wineType).toEqual({ value: 'red', sure: false })
  })

  it('is sure when a poorly read type word says the same', () => {
    expect(parse([['CHABLIS', 40], ['Vin Blanc', 20, 60]]).wineType).toEqual({ value: 'white', sure: true, from: 'origin' })
    expect(parse([['Hausmarke', 40], ['PROSECCO', 30], ['Spumante', 14, 60]]).wineType).toMatchObject({ value: 'sparkling', sure: true })
  })

  it('gives no type from appellations that disagree', () => {
    expect(parse([['BAROLO', 40], ['CHABLIS', 30]]).wineType?.sure).not.toBe(true)
  })

  it('ignores the appellation inside the producer’s address or bottling note', () => {
    const result = parse([['Hausmarke', 40], ['Imbottigliato da Cantina Rossi, Barolo', 10]])
    expect(result.wineType).toBeUndefined()
    expect(result.grapeVariety).toBeUndefined()
    expect(result.grapeCandidates).toBeUndefined()
  })
})

describe('wine type: printed grapes against the appellation', () => {
  it('gives no sure type from the appellation over grapes of the other colour', () => {
    // Something was misread: only the grape's colour is offered
    const barolo = parse([['BAROLO', 40], ['Chardonnay', 20]])
    expect(barolo.wineType).toEqual({ value: 'white', sure: false, from: 'grape' })
    expect(barolo.grapeVariety).toEqual({ value: 'Chardonnay', sure: true })
    expect(parse([['DOGLIANI', 40], ['Arneis', 20]]).wineType).toEqual({ value: 'white', sure: false, from: 'grape' })
    expect(parse([['AVERSA', 40], ['Aglianico', 20]]).wineType).toEqual({ value: 'red', sure: false, from: 'grape' })
    // Also when only one of several grapes is of the other colour
    expect(parse([['BAROLO', 40], ['Nebbiolo · Chardonnay', 20]]).wineType?.sure).not.toBe(true)
  })

  it('keeps the sure type when the grapes fit', () => {
    expect(parse([['BAROLO', 40], ['Nebbiolo', 20]]).wineType).toEqual({ value: 'red', sure: true, from: 'origin' })
    // Sparkling wine is made from grapes of both colours
    expect(parse([['ASTI', 40], ['Pinot Noir', 20]]).wineType).toEqual({ value: 'sparkling', sure: true, from: 'origin' })
  })
})

describe('wine type: one-word appellations that are also towns', () => {
  it('takes one in the small print only as a suggestion', () => {
    expect(parse([['Hausmarke', 40], ['Aversa', 12]]).wineType).toEqual({ value: 'white', sure: false, from: 'origin' })
    const dogliani = parse([['Pecchenino', 30], ['LANGHE NEBBIOLO', 30], ['DOC', 14], ['Dogliani', 12]])
    expect(dogliani.wineType?.sure).toBe(false)
  })

  it('is sure when set large or named as the wine’s designation', () => {
    expect(parse([['Hausmarke', 30], ['DOGLIANI', 40]]).wineType).toEqual({ value: 'red', sure: true, from: 'origin' })
    expect(parse([['Hausmarke', 40], ['Dogliani DOCG', 12]]).wineType).toEqual({ value: 'red', sure: true, from: 'origin' })
  })

  it('needs nothing extra for a name of several words', () => {
    expect(parse([['Hausmarke', 40], ["Barbera d'Asti", 12]]).wineType).toEqual({ value: 'red', sure: true, from: 'origin' })
  })
})

describe('appellations set over two lines', () => {
  it('reads "BARBERA" / "d’Asti" as Barbera d’Asti, not as Asti', () => {
    const result = parse([['Braida', 30], ['BARBERA', 50], ["d'Asti", 18], ['Denominazione di Origine Controllata e Garantita', 10]])
    expect(result.wineType).toEqual({ value: 'red', sure: true, from: 'origin' })
    expect(result.grapeVariety).toMatchObject({ value: 'Barbera', sure: true })
  })

  it('reads "VIN SANTO" / "DI CARMIGNANO" as Vin Santo di Carmignano, not as Carmignano', () => {
    const result = parse([['Capezzana', 30], ['VIN SANTO', 36], ['DI CARMIGNANO', 30], ['DOC', 16]])
    // Only the misread grape "Carignano" may still offer red
    expect(result.wineType?.sure).not.toBe(true)
    expect(result.wineType?.from).not.toBe('origin')
  })

  it('does not take Montrachet out of Chassagne-Montrachet', () => {
    expect(parse([['Domaine Ramonet', 30], ['CHASSAGNE-', 36], ['MONTRACHET', 36]]).wineType).toBeUndefined()
    // A misread first half
    expect(parse([['Domaine Ramonet', 30], ['CHASSACNF-MONTRACHET', 36]]).wineType).toBeUndefined()
  })
})

describe('wine type: appellation under a bare producer word', () => {
  it('still reads the appellation ("Domaine" / "CHABLIS")', () => {
    expect(parse([['Domaine', 20], ['CHABLIS', 40]]).wineType).toEqual({ value: 'white', sure: true, from: 'origin' })
  })
})

describe('wine type: Italian type words', () => {
  it('reads "Chiaretto" as rosé and "Trentodoc" as sparkling', () => {
    expect(parse([['BARDOLINO', 40], ['Chiaretto', 20]]).wineType).toEqual({ value: 'rose', sure: true })
    expect(parse([['Ferrari', 40], ['TRENTODOC', 20]]).wineType).toEqual({ value: 'sparkling', sure: true })
  })
})

describe('grape: appellation that requires one grape (≥ 85 %)', () => {
  it('is sure when the appellation fixes the colour', () => {
    expect(parse([['BAROLO', 40], ['DOCG', 14]]).grapeVariety).toEqual({ value: 'Nebbiolo', sure: true, from: 'origin' })
    expect(parse([['Domaine Laroche', 30], ['CHABLIS', 40]]).grapeVariety).toEqual({ value: 'Chardonnay', sure: true, from: 'origin' })
  })

  it('lets a printed grape win and never adds the appellation grape to it', () => {
    const result = parse([['BAROLO', 40], ['Barbera', 20]])
    expect(result.grapeVariety).toEqual({ value: 'Barbera', sure: true })
    expect(result.grapeCandidates).toBeUndefined()
  })

  it('makes a poorly read printed grape sure when it is the appellation’s main grape', () => {
    expect(parse([['BAROLO', 40], ['Nebbiolo', 20, 60]]).grapeVariety).toEqual({ value: 'Nebbiolo', sure: true, from: 'origin' })
    // Another grape, or the colour not fixed: stays a suggestion
    expect(parse([['BAROLO', 40], ['Barbera', 20, 60]]).grapeVariety).toEqual({ value: 'Barbera', sure: false })
    expect(parse([['Domaine Laroche', 30], ['SANCERRE', 40], ['Sauvignon Blanc', 20, 60]]).grapeVariety).toEqual({
      value: 'Sauvignon Blanc',
      sure: false,
    })
    expect(parse([['BAROLO', 40], ['Nebbiolo', 20, 60], ['Barbera', 20, 60]]).grapeVariety?.sure).toBe(false)
  })

  it('is only a suggestion when the appellation is read poorly', () => {
    const result = parse([['Hausmarke', 40], ['BAROLO', 30, 60]])
    expect(result.grapeVariety).toBeUndefined()
    expect(result.grapeCandidates).toEqual(['Nebbiolo'])
  })

  it('is not sure when the colour of a two-colour appellation is unknown (Sancerre)', () => {
    const result = parse([['Domaine Laroche', 30], ['SANCERRE', 40]])
    expect(result.grapeVariety).toBeUndefined()
    // Display names of the country, not the German canonical name
    expect(result.grapeCandidates).toEqual(['Sauvignon Blanc', 'Pinot Noir'])
  })

  it('is sure when the label fixes the colour that the main grape gives (Sancerre Blanc)', () => {
    const result = parse([['Domaine Laroche', 30], ['SANCERRE', 40], ['Blanc', 20]])
    expect(result.wineType).toEqual({ value: 'white', sure: true })
    expect(result.grapeVariety).toEqual({ value: 'Sauvignon Blanc', sure: true, from: 'origin' })
  })

  it('offers only grapes of the colour on the label otherwise (Sancerre Rouge)', () => {
    const result = parse([['Domaine Laroche', 30], ['SANCERRE', 40], ['Rouge', 20]])
    expect(result.grapeVariety).toBeUndefined()
    expect(result.grapeCandidates).toEqual(['Pinot Noir'])
  })

  it('is not sure when the label contradicts the appellation’s colour', () => {
    const result = parse([['CHABLIS', 40], ['Vin Rouge', 20]])
    expect(result.grapeVariety).toBeUndefined()
  })

  it('is not sure when appellations disagree', () => {
    const result = parse([['BAROLO', 40], ['CHABLIS', 30]])
    expect(result.grapeVariety).toBeUndefined()
    expect(result.grapeCandidates).toEqual(['Nebbiolo', 'Chardonnay'])
  })

  it('stays sure next to a wider appellation that allows the main grape', () => {
    expect(parse([['BAROLO', 40], ['LANGHE', 14]]).grapeVariety).toEqual({ value: 'Nebbiolo', sure: true, from: 'origin' })
  })
})

describe('grape: typical grapes of an appellation that allows several', () => {
  it('offers up to three, never fills them in (Rioja)', () => {
    const result = parse([['Bodegas Muga', 30], ['RIOJA', 40], ['Crianza', 20]])
    expect(result.grapeVariety).toBeUndefined()
    expect(result.grapeCandidates).toEqual(['Tempranillo', 'Garnacha', 'Graciano'])
    // Red and white grapes allowed: no type from the grapes (the "Rioja" hint still says red)
    expect(result.wineType).toEqual({ value: 'red', sure: false })
  })

  it('keeps a printed grape on a Bordeaux label', () => {
    const result = parse([['Château Lafleur', 30], ['BORDEAUX', 30], ['Merlot', 20]])
    expect(result.grapeVariety).toEqual({ value: 'Merlot', sure: true })
    expect(result.grapeCandidates).toBeUndefined()
  })

  it('offers the grapes of a sparkling appellation (Prosecco)', () => {
    const result = parse([['Hausmarke', 40], ['PROSECCO', 30], ['DOC', 14]])
    expect(result.grapeCandidates).toEqual(['Glera', 'Chardonnay'])
    expect(result.wineType).toEqual({ value: 'sparkling', sure: true })
  })

  it('offers nothing for an appellation without grape data', () => {
    expect(parse([['Hausmarke', 40], ['PFALZ', 20]]).grapeCandidates).toBeUndefined()
  })
})

describe('wine type: suggestion from grapes', () => {
  it('suggests the colour of printed grapes', () => {
    expect(parse([['Hausmarke', 40], ['Dornfelder', 20]]).wineType).toEqual({ value: 'red', sure: false, from: 'grape' })
  })

  it('suggests the colour of the appellation’s typical grapes when nothing else says it', () => {
    expect(parse([['Tenuta San Guido', 30], ['BOLGHERI', 40]]).wineType).toEqual({ value: 'red', sure: false, from: 'origin' })
  })

  it('suggests nothing from grapes of both colours', () => {
    expect(parse([['Domaine Laroche', 30], ['SANCERRE', 40]]).wineType?.from).toBeUndefined()
    expect(parse([['Hausmarke', 40], ['Merlot & Chardonnay', 20]]).wineType).toBeUndefined()
  })
})

describe('prefill of appellation grapes', () => {
  it('offers them with the hint "aus der Herkunft"', () => {
    const plan = planPrefill(parse([['Tenuta San Guido', 30], ['BOLGHERI', 40]]), {})
    expect(plan.suggestions.grapeVariety).toEqual([
      { value: 'Cabernet Sauvignon', label: 'Cabernet Sauvignon', hint: 'aus der Herkunft' },
      { value: 'Merlot', label: 'Merlot', hint: 'aus der Herkunft' },
      { value: 'Cabernet Franc', label: 'Cabernet Franc', hint: 'aus der Herkunft' },
    ])
    expect(plan.suggestions.wineType).toEqual([{ value: 'red', label: 'Rotwein', hint: 'aus der Herkunft' }])
  })

  it('writes a sure main grape and marks it', () => {
    const plan = planPrefill(parse([['BAROLO', 40], ['DOCG', 14]]), {})
    expect(plan.values).toMatchObject({ grapeVariety: 'Nebbiolo', wineType: 'red' })
    expect(plan.marked).toContain('grapeVariety')
  })
})

describe('grape names of the appellation’s country', () => {
  it('only renames known grapes, to one of their own aliases', () => {
    const aliases = new Map(GRAPES.map((g) => [g.canonical, new Set(g.aliases.map((a) => a.toLowerCase()))]))
    for (const [canonical, names] of Object.entries(ORIGIN_GRAPE_NAMES)) {
      expect(aliases.has(canonical), canonical).toBe(true)
      for (const name of Object.values(names)) expect(aliases.get(canonical)!.has(name.toLowerCase()), name).toBe(true)
    }
  })

  it('names a grape from the appellation like the country does', () => {
    // Hand-written fixture, not a claim about the real appellation rules
    const appellations: AppellationRef[] = [{ name: 'Sopron', country: 'HU', wineType: 'red', grapes: ['Lemberger'], mainGrape: 'Lemberger' }]
    const result = parseLabel(stack([['Pincészet Kovács', 30], ['SOPRON', 40]]), { currentYear: 2026, appellations })
    expect(result.grapeVariety).toEqual({ value: 'Kékfrankos', sure: true, from: 'origin' })
  })
})
