// The criteria for wine type and grape with the real reference list (public/data/appellations.json,
// built by scripts/build-reference-data.mjs): the data and the parser have to fit together.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseLabel } from './parse-label'
import { planPrefill } from './prefill'
import { parseAppellations } from './reference-data'
import { stack, type LineSpec } from './test-lines'

const appellations = parseAppellations(JSON.parse(readFileSync('public/data/appellations.json', 'utf8')))
const find = (name: string) => appellations.find((a) => a.name === name)
const parse = (specs: LineSpec[]) => parseLabel(stack(specs), { currentYear: 2026, appellations })

describe('label scan with public/data/appellations.json', () => {
  it('Barolo DOCG: red and Nebbiolo, both sure', () => {
    const result = parse([['Cantina Rossi', 30], ['BAROLO', 40], ['DOCG', 16], ['2019', 16]])
    expect(result.wineType).toEqual({ value: 'red', sure: true, from: 'origin' })
    expect(result.grapeVariety).toEqual({ value: 'Nebbiolo', sure: true, from: 'origin' })
    expect(result.vintage).toEqual({ value: 2019, sure: true })
  })

  it("Montepulciano d'Abruzzo: red, and Montepulciano sure because the rules require ≥ 85 %", () => {
    expect(find("Montepulciano d'Abruzzo")?.mainGrape).toBe('Montepulciano')
    const result = parse([['Cantina Rossi', 30], ["MONTEPULCIANO D'ABRUZZO", 36], ['Denominazione di Origine Controllata', 14]])
    expect(result.wineType).toEqual({ value: 'red', sure: true, from: 'origin' })
    expect(result.grapeVariety).toMatchObject({ value: 'Montepulciano', sure: true })
  })

  it('Rioja Crianza: grapes only as suggestions, Tempranillo first', () => {
    const rioja = find('Rioja')
    expect(rioja?.mainGrape).toBeUndefined()
    const result = parse([['Bodegas Muga', 30], ['RIOJA', 40], ['Crianza', 20]])
    expect(result.grapeVariety).toBeUndefined()
    expect(result.grapeCandidates?.[0]).toBe('Tempranillo')
    // Rioja allows all three colours: no sure type from the appellation
    expect(rioja?.wineType).toBeUndefined()
    expect(result.wineType?.sure ?? false).toBe(false)
  })

  it('Prosecco DOC Extra Dry: sparkling sure, Glera sure (≥ 85 %)', () => {
    const result = parse([['Villa Sandi', 30], ['PROSECCO', 40], ['DOC', 16], ['Extra Dry', 18]])
    expect(result.wineType).toMatchObject({ value: 'sparkling', sure: true })
    expect(result.grapeVariety).toEqual({ value: 'Glera', sure: true, from: 'origin' })
  })

  it('Chablis: white and Chardonnay, both sure', () => {
    const result = parse([['Domaine Laroche', 30], ['CHABLIS', 40], ['Appellation Chablis Contrôlée', 14]])
    expect(result.wineType).toEqual({ value: 'white', sure: true, from: 'origin' })
    expect(result.grapeVariety).toEqual({ value: 'Chardonnay', sure: true, from: 'origin' })
  })

  it('Sancerre without a colour word: no sure grape, both colours offered', () => {
    const result = parse([['Domaine Vacheron', 30], ['SANCERRE', 40]])
    expect(result.grapeVariety).toBeUndefined()
    expect(result.wineType?.sure ?? false).toBe(false)
    expect(result.grapeCandidates).toEqual(expect.arrayContaining(['Sauvignon Blanc', 'Pinot Noir']))
  })

  it('Blanc de Noirs Spätburgunder: white, the printed grape stays', () => {
    const result = parse([['Weingut Kranz', 30], ['Blanc de Noirs', 24], ['Spätburgunder', 18], ['Pfalz', 14]])
    expect(result.wineType).toEqual({ value: 'white', sure: true })
    expect(result.grapeVariety).toEqual({ value: 'Spätburgunder', sure: true })
  })

  it('Trento is a town on Trentino labels, not a sparkling wine', () => {
    expect(find('Trento')?.wineType).toBeUndefined()
    const teroldego = parse([['Foradori', 30], ['TEROLDEGO ROTALIANO', 30], ['DOC', 16], ['Mezzolombardo - Trento - Italia', 10]])
    expect(teroldego.wineType?.value).not.toBe('sparkling')
    const muller = parse([['Hausmarke', 30], ['MÜLLER THURGAU', 30], ['Vigneti delle Dolomiti IGT', 14], ['TRENTO', 12]])
    expect(muller.wineType?.value).not.toBe('sparkling')
  })

  it('a one-word appellation in the small print does not override the grape (Pantelleria, Aversa)', () => {
    const nero = parse([['Hausmarke', 30], ["NERO D'AVOLA", 30], ['Terre Siciliane IGT', 14], ['Pantelleria', 12]])
    expect(nero.wineType).toEqual({ value: 'red', sure: false, from: 'grape' })
    const aglianico = parse([['Hausmarke', 30], ['AGLIANICO', 30], ['Campania IGT', 14], ['Aversa', 12]])
    expect(aglianico.wineType).toEqual({ value: 'red', sure: false, from: 'grape' })
  })

  it('Vernaccia di Serrapetrona and Lambrusco di Sorbara are only made sparkling', () => {
    expect(parse([['Hausmarke', 30], ['VERNACCIA DI SERRAPETRONA', 36], ['DOCG', 14]]).wineType).toEqual({
      value: 'sparkling',
      sure: true,
      from: 'origin',
    })
    expect(parse([['Hausmarke', 30], ['LAMBRUSCO DI SORBARA', 36], ['DOC', 14]]).wineType).toEqual({
      value: 'sparkling',
      sure: true,
      from: 'origin',
    })
  })

  it('Salice Salentino Rosso: Negroamaro only offered (the Aleatico type is also red)', () => {
    const result = parse([['Hausmarke', 30], ['SALICE SALENTINO', 36], ['Rosso', 20]])
    expect(result.grapeVariety).toBeUndefined()
    expect(result.grapeCandidates?.[0]).toBe('Negroamaro')
  })

  it('fills the sure values and marks them for the host to check', () => {
    const plan = planPrefill(parse([['Cantina Rossi', 30], ['BAROLO', 40], ['DOCG', 16]]), {})
    expect(plan.values).toMatchObject({ wineType: 'red', grapeVariety: 'Nebbiolo' })
    expect(plan.marked).toEqual(expect.arrayContaining(['wineType', 'grapeVariety']))
  })
})
