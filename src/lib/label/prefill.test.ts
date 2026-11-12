import { describe, expect, it } from 'vitest'
import { planPrefill, prefillMessage, type PrefillPlan } from './prefill'

const empty: PrefillPlan = { values: {}, marked: [], suggestions: {}, lines: [], found: 0 }

describe('planPrefill', () => {
  it('writes only sure values into empty fields and keeps what the host typed', () => {
    const plan = planPrefill(
      {
        name: { value: 'Kabinett', sure: true },
        winery: { value: 'Weingut Dr. Loosen', sure: true },
        vintage: { value: 2021, sure: true },
        grapeVariety: { value: 'Riesling', sure: true },
        sweetness: { value: 'dry', sure: true },
      },
      { name: 'Mein Name', winery: '  ', vintage: '', wineType: 'red' },
    )
    expect(plan.values).toEqual({
      winery: 'Weingut Dr. Loosen',
      vintage: '2021',
      grapeVariety: 'Riesling',
      sweetness: 'dry',
    })
    expect(plan.marked).toEqual(['winery', 'vintage', 'grapeVariety', 'sweetness'])
    expect(plan.suggestions).toEqual({})
    expect(plan.found).toBe(5)
  })

  it('never writes uncertain values: they become suggestions or label lines instead', () => {
    const plan = planPrefill(
      {
        name: { value: 'Lacroix Belle', sure: false },
        nameCandidates: ['Camp del Gal'],
        winery: { value: 'Mis en Bouteille', sure: false },
        vintage: { value: 2019, sure: false },
        sweetness: { value: 'dry', sure: false },
      },
      {},
    )
    expect(plan.values).toEqual({})
    expect(plan.marked).toEqual([])
    // Name and winery are not suggested under their fields: the host assigns the lines
    expect(plan.suggestions.name).toBeUndefined()
    expect(plan.suggestions.winery).toBeUndefined()
    expect(plan.lines.map((l) => l.text)).toEqual(['Mis en Bouteille', 'Lacroix Belle', 'Camp del Gal'])
    expect(plan.suggestions.vintage).toEqual([{ value: '2019', label: '2019' }])
    expect(plan.suggestions.sweetness).toEqual([{ value: 'dry', label: 'trocken' }])
    expect(plan.found).toBe(4)
  })

  it('offers taste descriptions only as suggestions for Beschreibung, never writes or marks them', () => {
    const plan = planPrefill(
      { sweetness: { value: 'sweet', sure: true }, descriptionCandidates: ['Süß & fruchtig', 'süß & FRUCHTIG', 'Mild'] },
      {},
    )
    expect(plan.values).toEqual({ sweetness: 'sweet' })
    expect(plan.marked).toEqual(['sweetness'])
    // Case-insensitive duplicates count once
    expect(plan.suggestions.description).toEqual([
      { value: 'Süß & fruchtig', label: 'Süß & fruchtig' },
      { value: 'Mild', label: 'Mild' },
    ])
    expect(plan.lines).toEqual([])
    expect(plan.found).toBe(2)
  })

  it('never suggests a description over text the host typed, and keeps to the field limit', () => {
    const typed = planPrefill({ descriptionCandidates: ['Süß & fruchtig'] }, { description: 'fruchtig' })
    expect(typed.suggestions.description).toBeUndefined()
    expect(typed.found).toBe(1)
    const long = planPrefill({ descriptionCandidates: ['x'.repeat(250)] }, {})
    expect(long.suggestions.description?.[0].value).toHaveLength(200)
  })

  it('explains a wine type inferred from the grape', () => {
    const plan = planPrefill(
      { wineType: { value: 'red', sure: false, from: 'grape' }, grapeVariety: { value: 'Merlot', sure: true } },
      {},
    )
    expect(plan.values).toEqual({ grapeVariety: 'Merlot' })
    expect(plan.suggestions.wineType).toEqual([{ value: 'red', label: 'Rotwein', hint: 'aus der Rebsorte' }])
    // A type from a method word ("Appassimento") has nothing to point at
    const bare = planPrefill({ wineType: { value: 'red', sure: false } }, {})
    expect(bare.suggestions.wineType).toEqual([{ value: 'red', label: 'Rotwein' }])
  })

  it('explains a wine type and grapes from the appellation', () => {
    const plan = planPrefill(
      { wineType: { value: 'red', sure: false, from: 'origin' }, grapeCandidates: ['Tempranillo', 'Garnacha', 'Graciano', 'Mazuelo'] },
      {},
    )
    expect(plan.values).toEqual({})
    expect(plan.suggestions.wineType).toEqual([{ value: 'red', label: 'Rotwein', hint: 'aus der Herkunft' }])
    expect(plan.suggestions.grapeVariety).toEqual([
      { value: 'Tempranillo', label: 'Tempranillo', hint: 'aus der Herkunft' },
      { value: 'Garnacha', label: 'Garnacha', hint: 'aus der Herkunft' },
      { value: 'Graciano', label: 'Graciano', hint: 'aus der Herkunft' },
    ])
    expect(plan.found).toBe(2)
  })

  it('writes a sure grape from the appellation like any sure value, and never second-guesses typed text', () => {
    const plan = planPrefill({ grapeVariety: { value: 'Nebbiolo', sure: true, from: 'origin' } }, {})
    expect(plan.values).toEqual({ grapeVariety: 'Nebbiolo' })
    expect(plan.marked).toEqual(['grapeVariety'])
    const typed = planPrefill({ grapeCandidates: ['Tempranillo'] }, { grapeVariety: 'Garnacha' })
    expect(typed.suggestions.grapeVariety).toBeUndefined()
  })

  it('offers candidate lines next to a sure value, without repeating it', () => {
    const plan = planPrefill(
      {
        name: { value: 'Camp del Gal', sure: true },
        nameCandidates: ['camp del gal', 'La Croix Belle', 'La croix belle', 'A', 'B', 'C'],
        winery: { value: 'Domaine X', sure: true },
        wineryCandidates: ['Domaine X', 'Cave Y'],
      },
      {},
    )
    expect(plan.values).toEqual({ name: 'Camp del Gal', winery: 'Domaine X' })
    expect(plan.suggestions.name).toBeUndefined()
    expect(plan.lines.map((l) => l.text)).toEqual(['La Croix Belle', 'A', 'B', 'C', 'Cave Y'])
  })

  it('offers nothing under fields the host already filled, but still lists the label lines', () => {
    const plan = planPrefill(
      { name: { value: 'X', sure: false }, nameCandidates: ['Y'], vintage: { value: 2020, sure: false } },
      { name: 'Mein Wein' },
    )
    expect(plan.suggestions.name).toBeUndefined()
    expect(plan.suggestions.vintage).toBeDefined()
    expect(plan.lines.map((l) => l.text)).toEqual(['X', 'Y'])
    expect(plan.found).toBe(2)
  })

  it('ignores blank suggestions and caps text to the form limits', () => {
    const plan = planPrefill(
      { name: { value: '   ', sure: true }, winery: { value: 'W'.repeat(100), sure: true } },
      {},
    )
    expect(plan.values).toEqual({ winery: 'W'.repeat(80) })
    expect(plan.found).toBe(1)
  })

  it('drops vintages outside the allowed range', () => {
    const plan = planPrefill({ vintage: { value: 1850, sure: true } }, {})
    expect(plan.values).toEqual({})
    expect(plan.suggestions).toEqual({})
    expect(plan.lines).toEqual([])
  })
})

describe('prefillMessage', () => {
  it('stays quiet when the margin note speaks for the result', () => {
    expect(prefillMessage({ ...empty, values: { name: 'A' }, marked: ['name'], found: 1 })).toBe('')
    expect(prefillMessage({ ...empty, suggestions: { name: [{ value: 'A', label: 'A' }] }, found: 1 })).toBe('')
  })

  it('stays quiet when label lines are offered', () => {
    expect(prefillMessage({ ...empty, lines: [{ text: 'A', inWineryList: false }], found: 1 })).toBe('')
  })

  it('says when everything found was already filled in', () => {
    expect(prefillMessage({ ...empty, found: 2 })).toMatch(/schon ausgefüllt/)
  })

  it('gives a tip when nothing was found', () => {
    expect(prefillMessage(empty)).toMatch(/Nichts erkannt/)
  })
})
