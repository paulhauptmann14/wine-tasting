import { describe, expect, it } from 'vitest'
import { parseLabel } from './parse-label'
import { planPrefill } from './prefill'
import { stack, type LineSpec } from './test-lines'

const parse = (specs: LineSpec[], matchWinery?: (text: string) => string | null) =>
  parseLabel(stack(specs), { currentYear: 2026, matchWinery })

describe('cleaning', () => {
  it('ignores lines with low confidence', () => {
    expect(parse([['Weingut Keller', 30, 12], ['Riesling', 40]]).winery).toBeUndefined()
  })

  it('ignores lines that are mostly not letters', () => {
    expect(parse([['~=|| -- ||', 30], ['@@#% 1:', 30], ['Zz Ff', 30]])).toEqual({})
  })

  it('keeps a line that is only a year', () => {
    expect(parse([['Riesling', 40], ['2022', 20]]).vintage).toEqual({ value: 2022, sure: true })
  })

  it('returns nothing for no lines', () => {
    expect(parseLabel([])).toEqual({})
  })
})

describe('vintage', () => {
  it('fixes O → 0 and l → 1 but is not sure then', () => {
    expect(parse([['2O19']]).vintage).toEqual({ value: 2019, sure: false })
    expect(parse([['l998']]).vintage).toEqual({ value: 1998, sure: false })
  })

  it('accepts 1950 up to next year only', () => {
    expect(parse([['1949']]).vintage).toBeUndefined()
    expect(parse([['1950']]).vintage?.value).toBe(1950)
    expect(parse([['2027']]).vintage?.value).toBe(2027)
    expect(parse([['2028']]).vintage).toBeUndefined()
  })

  it('ignores years in addresses, phone numbers, dates, lot numbers and founding notes', () => {
    const lines: LineSpec[] = [
      ['Riesling', 40],
      ['Weinstraße 12, D-67146 Deidesheim', 8],
      ['A-3601 Dürnstein', 8],
      ['Tel. +49 6326 2019', 8],
      ['Familienweingut seit 1972', 8],
      ['abgefüllt am 12.03.2020', 8],
      ['L 2021', 8],
    ]
    expect(parse(lines).vintage).toBeUndefined()
  })

  it('finds the year inside a name line', () => {
    expect(parse([['2019 Riesling trocken', 30]]).vintage).toEqual({ value: 2019, sure: true })
  })

  it('prefers a year on its own line and is unsure when years disagree', () => {
    const result = parse([['Cuvée 1998', 30], ['2021', 14]])
    expect(result.vintage).toEqual({ value: 2021, sure: false })
  })

  it('reads "Jahrgang 2018" as a vintage', () => {
    expect(parse([['Jahrgang 2018', 12]]).vintage).toEqual({ value: 2018, sure: true })
  })

  it('never takes the year of a medal or competition', () => {
    const awards = [
      'Gold Berliner Wein Trophy 2023',
      'DLG Gold 2024',
      'Landesweinprämierung 2024',
      'Bundesehrenpreis 2023',
      'Goldene Kammerpreismünze 2022',
      'Concours Mondial de Bruxelles 2023',
      'Decanter World Wine Awards 2022',
      'Mundus Vini 2021 Silber',
      "Médaille d'Or Paris 2022",
      "Medaglia d'Oro 2021",
      'Falstaff 93 Punkte 2023',
    ]
    for (const award of awards) {
      expect(parse([['Weingut Schmidt', 20], ['SEKT', 40], ['trocken', 20], [award, 8]]).vintage, award).toBeUndefined()
    }
  })

  it('never takes the year of a medal sticker read as separate lines', () => {
    expect(parse([['Riesling', 40], ['DLG', 10], ['2024', 10], ['GOLD', 10]]).vintage).toBeUndefined()
    expect(parse([['Riesling', 40], ['BERLINER WEIN', 10], ['TROPHY', 10], ['2023', 10]]).vintage).toBeUndefined()
  })

  // Once a medal or founding year was set aside, the year left over may be the wrong one: offer it, never fill it in.
  it('only suggests the real vintage next to a medal', () => {
    expect(parse([['Riesling', 40], ['2022', 20], ['DLG Gold 2024', 8]]).vintage).toEqual({ value: 2022, sure: false })
    expect(parse([['Riesling', 40], ['2022', 30], ['DLG', 10], ['2024', 10], ['GOLD', 10]]).vintage).toEqual({ value: 2022, sure: false })
  })

  it('only suggests a logo year next to a medal', () => {
    const result = parse([['Weingut Schmidt', 20], ['1958', 14], ['Riesling', 40], ['DLG Gold 2024', 8]])
    expect(result.vintage).toEqual({ value: 1958, sure: false })
    const plan = planPrefill(result, {})
    expect(plan.values.vintage).toBeUndefined()
    expect(plan.marked).not.toContain('vintage')
    expect(plan.suggestions.vintage?.map((o) => o.value)).toEqual(['1958'])
  })

  it('still fills in a vintage when the medal or founding year is no possible vintage', () => {
    expect(parse([['Familienweingut seit 1890', 8], ['Riesling', 40], ['2022', 20]]).vintage).toEqual({ value: 2022, sure: true })
  })

  it('does not mistake words ending like a founding word for one', () => {
    // "harvEST", "Sud-OuEST", "KenDALL" end in a founding word but are none
    expect(parse([['Late Harvest', 20], ['2021', 20]]).vintage).toEqual({ value: 2021, sure: true })
    expect(parse([['Riesling', 40], ['Harvest 2021', 20]]).vintage).toEqual({ value: 2021, sure: true })
    expect(parse([['IGP Sud-Ouest', 20], ['2020', 20]]).vintage).toEqual({ value: 2020, sure: true })
    expect(parse([['Kendall', 20], ['2019', 20]]).vintage).toEqual({ value: 2019, sure: true })
    // Real founding words still count
    expect(parse([['Weingut Schmidt', 20], ['Est. 1985', 10], ['Riesling', 40]]).vintage).toBeUndefined()
    expect(parse([['Weingut Schmidt', 20], ['EST 1985', 10], ['Riesling', 40]]).vintage).toBeUndefined()
  })

  it('never takes a founding year', () => {
    const notes = ['Anno 1962', 'gegründet 1964', 'Since 1952', 'depuis 1958', 'dal 1960', 'Tradition seit 1955', 'gegründet im Jahr 1971']
    for (const note of notes) {
      expect(parse([['Weingut Schmidt', 20], [note, 10], ['Riesling', 40]]).vintage, note).toBeUndefined()
    }
    // The founding word on the line above: "SEIT" / "1962"
    expect(parse([['Riesling', 40], ['SEIT', 10], ['1962', 10]]).vintage).toBeUndefined()
    // A vintage next to a founding year is only suggested
    expect(parse([['Anno 1962', 10], ['Riesling', 40], ['2021', 20]]).vintage).toEqual({ value: 2021, sure: false })
    expect(parse([['Riesling', 40], ['SEIT', 10], ['1962', 10], ['2021', 20]]).vintage).toEqual({ value: 2021, sure: false })
  })
})

describe('alcohol', () => {
  it('reads "% vol" in its usual spellings and is sure', () => {
    expect(parse([['Riesling', 40], ['13,5 % vol', 12]]).alcohol).toEqual({ value: 13.5, sure: true })
    expect(parse([['Riesling', 40], ['12,5%vol.', 12]]).alcohol).toEqual({ value: 12.5, sure: true })
    expect(parse([['Riesling', 40], ['750 ml  12.5 % Vol', 12]]).alcohol).toEqual({ value: 12.5, sure: true })
    expect(parse([['Riesling', 40], ['14 % VOL', 12]]).alcohol).toEqual({ value: 14, sure: true })
    expect(parse([['Riesling', 40], ['alc. 13,0 % vol', 12]]).alcohol).toEqual({ value: 13, sure: true })
    expect(parse([['Riesling', 40], ['Alc. 13.5% by vol.', 12]]).alcohol).toEqual({ value: 13.5, sure: true })
    expect(parse([['Riesling', 40], ['13.5% ABV', 12]]).alcohol).toEqual({ value: 13.5, sure: true })
  })

  it('reads "alc."/"Alkohol" before the number without "vol"', () => {
    expect(parse([['Riesling', 40], ['Alkoholgehalt: 11,5 %', 12]]).alcohol).toEqual({ value: 11.5, sure: true })
    expect(parse([['Riesling', 40], ['Alc 13%', 12]]).alcohol).toEqual({ value: 13, sure: true })
  })

  it('is only a suggestion when the line is poorly read', () => {
    expect(parse([['Riesling', 40], ['13,5 % vol', 12, 50]]).alcohol).toEqual({ value: 13.5, sure: false })
  })

  it('ignores percentages that are no alcohol and values outside 0–25', () => {
    expect(parse([['Riesling', 40], ['100 % Riesling', 12]]).alcohol).toBeUndefined()
    expect(parse([['Riesling', 40], ['Recycelt zu 30 %', 12]]).alcohol).toBeUndefined()
    expect(parse([['Riesling', 40], ['13,5', 12]]).alcohol).toBeUndefined()
    expect(parse([['Riesling', 40], ['45 % vol', 12]]).alcohol).toBeUndefined()
  })

  it('is not sure when a digit stands right before the number – OCR may have lost the comma', () => {
    expect(parse([['Riesling', 40], ['13 5 % vol', 12]]).alcohol).toEqual({ value: 5, sure: false })
    expect(parse([['Riesling', 40], ['1 3,5 % vol', 12]]).alcohol).toEqual({ value: 3.5, sure: false })
    expect(parse([['Riesling', 40], ['13 , 5 % vol', 12]]).alcohol).toEqual({ value: 13.5, sure: true })
  })

  it('is not sure for an upper limit like "< 0,5 % vol"', () => {
    for (const text of ['alkoholfrei < 0,5 % vol', 'Alkoholgehalt: <0,5 % vol', 'unter 0,5 % vol', 'alc. max. 0.5% vol', 'weniger als 0,5 % vol', 'bis 0,5 % vol', '≤ 0,5 % vol']) {
      expect(parse([['Riesling', 40], [text, 12]]).alcohol, text).toEqual({ value: 0.5, sure: false })
    }
  })

  it('is not sure when the label shows two different values', () => {
    expect(parse([['Riesling', 40], ['12 % vol', 12], ['13 % vol', 12]]).alcohol).toEqual({ value: 12, sure: false })
    expect(parse([['Riesling', 40], ['12 % vol', 12], ['e 12 % vol', 12]]).alcohol).toEqual({ value: 12, sure: true })
  })

  it('never makes the alcohol line a name or a vintage', () => {
    const s = parse([['13,5 % vol', 40], ['Riesling', 30]])
    expect(s.nameCandidates ?? []).not.toContainEqual(expect.stringMatching(/vol/i))
    expect(s.vintage).toBeUndefined()
  })
})

describe('sweetness', () => {
  it.each([
    ['trocken', 'dry'],
    ['DRY RIESLING', 'dry'],
    ['vin sec', 'dry'],
    ['Secco', 'dry'],
    ['Vino Seco', 'dry'],
    ['Brut', 'dry'],
    ['halbtrocken', 'off_dry'],
    ['Halb-Trocken', 'off_dry'],
    ['feinherb', 'off_dry'],
    ['Demi-Sec', 'off_dry'],
    ['abboccato', 'off_dry'],
    ['Semiseco', 'off_dry'],
    ['lieblich', 'medium'],
    ['amabile', 'medium'],
    ['Moelleux', 'medium'],
    ['süß', 'sweet'],
    ['SÜSS & FRUCHTIG', 'sweet'],
    ['sweet', 'sweet'],
    ['Doux', 'sweet'],
    ['dolce', 'sweet'],
    ['Dulce', 'sweet'],
  ])('%s → %s', (text, expected) => {
    expect(parse([['Hausmarke', 40], [text, 14]]).sweetness).toEqual({ value: expected, sure: true })
  })

  it('never reads trocken inside Trockenbeerenauslese, but knows the style is sweet', () => {
    expect(parse([['Riesling Trockenbeerenauslese', 30]]).sweetness).toEqual({ value: 'sweet', sure: false })
  })

  it('does not read dolce inside Dolcetto', () => {
    expect(parse([['Dolcetto d\'Alba', 30]]).sweetness).toBeUndefined()
  })

  it('treats "mild" as lieblich, but unsure', () => {
    expect(parse([['Hausmarke', 40], ['mild', 14]]).sweetness).toEqual({ value: 'medium', sure: false })
  })

  it('is unsure when the label names two levels', () => {
    expect(parse([['Hausmarke', 40], ['trocken', 20], ['lieblich', 12]]).sweetness).toEqual({ value: 'dry', sure: false })
  })

  it('is unsure about a keyword read with low confidence', () => {
    expect(parse([['Hausmarke', 40], ['trocken', 14, 50]]).sweetness).toEqual({ value: 'dry', sure: false })
  })
})

describe('wine type', () => {
  it.each([
    ['Deutscher Rotwein', 'red'],
    ['Vin Rouge', 'red'],
    ['Rosso Toscano', 'red'],
    ['Vino Tinto', 'red'],
    ['Red Wine', 'red'],
    ['Weißwein', 'white'],
    ['Vin Blanc', 'white'],
    ['Bianco', 'white'],
    ['Vino Blanco', 'white'],
    ['White Wine', 'white'],
    ['Rosé', 'rose'],
    ['Rosato', 'rose'],
    ['Rosado', 'rose'],
    ['Weißherbst', 'rose'],
    ['Sekt b.A.', 'sparkling'],
    ['Winzersekt', 'sparkling'],
    ['Qualitätsschaumwein', 'sparkling'],
    ['Crémant d\'Alsace', 'sparkling'],
    ['Champagne', 'sparkling'],
    ['Cava', 'sparkling'],
    ['Prosecco', 'sparkling'],
    ['Spumante', 'sparkling'],
    ['Frizzante', 'sparkling'],
    ['Perlwein', 'sparkling'],
  ])('%s → %s', (text, expected) => {
    expect(parse([['Hausmarke', 40], [text, 14]]).wineType).toEqual({ value: expected, sure: true })
  })

  it('lets sparkling win over a colour', () => {
    expect(parse([['Rosé Sekt brut', 30]]).wineType).toEqual({ value: 'sparkling', sure: true })
  })

  it('infers the colour from grapes, unsure', () => {
    expect(parse([['Spätburgunder', 30]]).wineType).toEqual({ value: 'red', sure: false, from: 'grape' })
    expect(parse([['Riesling', 30]]).wineType).toEqual({ value: 'white', sure: false, from: 'grape' })
  })

  it('does not guess from grapes of both colours', () => {
    expect(parse([['Cuvée Merlot & Chardonnay', 30]]).wineType).toBeUndefined()
  })

  it('infers red from methods like appassimento, unsure', () => {
    expect(parse([['APPASSIMENTO', 30]]).wineType).toEqual({ value: 'red', sure: false })
  })

  it('is unsure about ROSE without accent', () => {
    expect(parse([['Hausmarke', 40], ['ROSE', 14]]).wineType).toEqual({ value: 'rose', sure: false })
  })

  it('ignores "red" in running text', () => {
    expect(parse([['Hausmarke', 40], ['with notes of red berries and a long finish', 8]]).wineType).toBeUndefined()
  })
})

describe('grape variety', () => {
  it('keeps the spelling of the label and joins several', () => {
    expect(parse([['Pinot Grigio delle Venezie', 30]]).grapeVariety).toEqual({ value: 'Pinot Grigio', sure: true })
    expect(parse([['Trollinger mit Lemberger', 30]]).grapeVariety?.value).toBe('Trollinger, Lemberger')
  })

  it('counts synonyms once', () => {
    expect(parse([['Spätburgunder', 30], ['Pinot Noir', 12]]).grapeVariety?.value).toBe('Spätburgunder')
  })

  it('prefers the longest match', () => {
    expect(parse([['Cabernet Sauvignon', 30]]).grapeVariety?.value).toBe('Cabernet Sauvignon')
    expect(parse([['Welschriesling', 30]]).grapeVariety?.value).toBe('Welschriesling')
    expect(parse([['Grüner Veltliner', 30]]).grapeVariety?.value).toBe('Grüner Veltliner')
  })

  it('title-cases capitals and accepts OCR variants of separators', () => {
    expect(parse([['GRÜNER VELTLINER', 30]]).grapeVariety?.value).toBe('Grüner Veltliner')
    expect(parse([['Müller Thurgau', 30]]).grapeVariety?.value).toBe('Müller Thurgau')
    expect(parse([["NERO D'AVOLA", 30]]).grapeVariety?.value).toBe("Nero d'Avola")
  })

  it('reads a grape name set over two lines as one grape', () => {
    const result = parse([['CABERNET', 30], ['SAUVIGNON', 30]])
    expect(result.grapeVariety).toEqual({ value: 'Cabernet Sauvignon', sure: true })
    expect(result.wineType).toEqual({ value: 'red', sure: false, from: 'grape' })
  })

  it('does not find grapes inside other words', () => {
    expect(parse([['Traminerhof Edition', 30]]).grapeVariety).toBeUndefined()
  })

  it('stays within the field limit of 60 characters', () => {
    const value = parse([['Cabernet Sauvignon, Cabernet Franc, Merlot, Petit Verdot, Malbec, Carmenère', 30]]).grapeVariety?.value
    expect(value?.length).toBeLessThanOrEqual(60)
    expect(value).toBe('Cabernet Sauvignon, Cabernet Franc, Merlot, Petit Verdot')
  })

  it('never reads a different variety as the grape it contains', () => {
    const own = ['Roter Veltliner', 'Frühroter Veltliner', 'Brauner Veltliner', 'Sauvignon Gris', 'Muskat-Trollinger', 'Riesling-Silvaner', 'Garnacha Tintorera', 'Malvasia Nera', 'Grenache Gris', 'Cabernet Jura']
    for (const grape of own) expect(parse([[grape, 30]]).grapeVariety, grape).toEqual({ value: grape, sure: true })
    expect(parse([['ROTER', 30], ['VELTLINER', 30]]).grapeVariety).toEqual({ value: 'Roter Veltliner', sure: true })
    expect(parse([['GRÜNER', 30], ['VELTLINER', 30]]).grapeVariety).toEqual({ value: 'Grüner Veltliner', sure: true })
    // Synonyms with a colour word stay one grape
    for (const grape of ['Grauer Burgunder', 'Weißer Riesling', 'Weißer Burgunder', 'Grüner Silvaner', 'Blauer Lemberger', 'Gelber Muskateller']) {
      expect(parse([[grape, 30]]).grapeVariety, grape).toEqual({ value: grape, sure: true })
    }
  })
})

describe('grape variety: places and producers', () => {
  it('never takes the town in "Vino Nobile / Rosso di Montepulciano" as the grape', () => {
    expect(parse([['POLIZIANO', 40], ['VINO NOBILE DI', 30], ['MONTEPULCIANO', 30], ['2019', 20]]).grapeVariety).toBeUndefined()
    expect(parse([['Vino Nobile di Montepulciano', 30]]).grapeVariety).toBeUndefined()
    expect(parse([['ROSSO DI MONTEPULCIANO', 30], ['DOC', 10]]).grapeVariety).toBeUndefined()
    expect(parse([['Vin Santo di Montepulciano', 30]]).grapeVariety).toBeUndefined()
    expect(parse([['Nobile di Montepulciano', 30], ['Sangiovese', 20]]).grapeVariety).toEqual({ value: 'Sangiovese', sure: true })
  })

  it("still reads the grape in Montepulciano d'Abruzzo", () => {
    expect(parse([["MONTEPULCIANO D'ABRUZZO", 30]]).grapeVariety).toEqual({ value: 'Montepulciano', sure: true })
    expect(parse([['MONTEPULCIANO', 30], ["D'ABRUZZO", 30]]).grapeVariety).toEqual({ value: 'Montepulciano', sure: true })
  })

  it('never takes a French village as the grape St. Laurent', () => {
    expect(parse([['HAUT-MÉDOC', 30], ['Saint-Laurent-Médoc', 12]]).grapeVariety).toBeUndefined()
    expect(parse([['LIRAC', 30], ['Saint-Laurent-des-Arbres', 12]]).grapeVariety).toBeUndefined()
    expect(parse([['St. Laurent', 30]]).grapeVariety).toEqual({ value: 'St. Laurent', sure: true })
    expect(parse([['Sankt Laurent Reserve', 30]]).grapeVariety).toEqual({ value: 'Sankt Laurent', sure: true })
  })

  it('ignores grape names in bottler, address and contact lines', () => {
    const cases: [LineSpec[], string][] = [
      [[['RIESLING', 40], ['2022', 20], ['Erzeugerabfüllung Weingut Kerner, D-55234 Bechtolsheim', 8]], 'Riesling'],
      [[['RIESLING', 40], ['Gutsabfüllung Weingut Bronner', 8]], 'Riesling'],
      [[['Spätburgunder', 40], ['Abgefüllt von Weingut Lemberger, 71384 Weinstadt', 8]], 'Spätburgunder'],
      [[['Grüner Veltliner', 40], ['Weingut Ortega · Hauptstraße 3 · 3550 Langenlois', 8]], 'Grüner Veltliner'],
      [[['ROSSO DI TOSCANA', 30], ['SANGIOVESE', 40], ['Imbottigliato da Avignonesi, Montepulciano (SI)', 8]], 'Sangiovese'],
      [[['Riesling', 40], ['www.weingut-kerner.de', 8]], 'Riesling'],
    ]
    for (const [lines, grape] of cases) {
      expect(parse(lines).grapeVariety, lines.at(-1)?.[0]).toEqual({ value: grape, sure: true })
    }
    // A grape before the bottler note still counts
    expect(parse([['Riesling Qualitätswein trocken · Gutsabfüllung', 10]]).grapeVariety).toEqual({ value: 'Riesling', sure: true })
    // Only a producer's name in the small print: no grape at all
    expect(parse([['Hausmarke', 40], ['Erzeugerabfüllung Weingut Kerner, D-55234 Bechtolsheim', 8]]).grapeVariety).toBeUndefined()
  })
})

describe('winery', () => {
  it('joins a brand above a one-word line with the keyword', () => {
    const result = parse([['Gallo', 40], ['FAMILY', 20], ['VINEYARDS', 12], ['GRENACHE', 20, 90, { gap: 40 }]])
    expect(result.wineryCandidates).toEqual(['Gallo Family Vineyards'])
    expect(result.nameCandidates).toEqual(['Grenache'])
  })

  it('does not join a keyword with a line far away', () => {
    const result = parse([['TRADITION', 30], ['WINERY', 14, 90, { gap: 80 }]])
    expect(result.wineryCandidates).toBeUndefined()
    expect(result.nameCandidates).toEqual(['Tradition'])
  })

  it('offers a keyword line without "Weingut", but does not fill it in', () => {
    const result = parse([['Weingut Dr. Loosen', 20], ['Riesling', 40]])
    expect(result.winery).toBeUndefined()
    expect(result.wineryCandidates).toEqual(['Dr. Loosen'])
    // Not in any list: nothing to flag
    expect(result.listedWineries).toBeUndefined()
  })

  it('keeps keywords that are part of the name', () => {
    expect(parse([['Domaine Leflaive', 20], ['Puligny-Montrachet', 40]]).wineryCandidates?.[0]).toBe('Domaine Leflaive')
    expect(parse([['CHÂTEAU MARGAUX', 40], ['Premier Grand Cru Classé', 20]]).wineryCandidates?.[0]).toBe('Château Margaux')
    expect(parse([['Tenuta San Guido', 20], ['Sassicaia', 40]]).wineryCandidates?.[0]).toBe('Tenuta San Guido')
  })

  it('keeps the keyword when only a filler word would remain', () => {
    expect(parse([['Weingut am Stein', 20], ['Silvaner', 40]]).wineryCandidates?.[0]).toBe('Weingut am Stein')
  })

  it('joins a keyword on its own line with the name next to it', () => {
    expect(parse([['WEINGUT', 10], ['KELLER', 30], ['Riesling', 40]]).wineryCandidates?.[0]).toBe('Keller')
    expect(parse([['Innamorati', 40], ['WEINBIET', 50], ['MANUFAKTUR', 10]]).wineryCandidates?.[0]).toBe('Weinbiet Manufaktur')
  })

  it('reads the bottler line and cuts the address', () => {
    const result = parse([['Riesling', 40], ['Erzeugerabfüllung Weingut Müller, D-67146 Deidesheim', 8]])
    expect(result.wineryCandidates).toEqual(['Müller'])
  })

  it('never offers "Mis en bouteille au domaine" or a misreading of it', () => {
    for (const bottled of ['MIS EN BOUTEILLE AU DOMAINE', 'MIS EN BOLTLILUE AU DOMAINE', 'MIS EN BOI']) {
      const result = parse([['Cuvée Marie', 40], [bottled, 8]])
      expect(result.winery).toBeUndefined()
      expect(result.wineryCandidates ?? []).not.toContainEqual(expect.stringMatching(/^mis/i))
      expect(result.nameCandidates ?? []).not.toContainEqual(expect.stringMatching(/^mis/i))
    }
  })

  it('fills in a strong winery list hit', () => {
    const match = (text: string) => (/lo.sen/i.test(text) ? 'Weingut Dr. Loosen' : null)
    expect(parse([['Weingut Dr. Loosen', 20], ['Riesling', 40]], match).winery).toEqual({ value: 'Weingut Dr. Loosen', sure: true })
    expect(parse([['Weingut Dr. Loosen', 20], ['Riesling', 40]], match).wineryCandidates).toEqual(['Dr. Loosen'])
  })

  it('finds a producer spread over several lines', () => {
    const match = (text: string) => (/gallo/i.test(text) ? 'Gallo Family Vineyards' : null)
    const result = parse([['Gallo', 40], ['FAMILY', 20], ['VINEYARDS', 12], ['GRENACHE', 20], ['ROSÉ', 16]], match)
    expect(result.winery).toEqual({ value: 'Gallo Family Vineyards', sure: true })
    expect(result.nameCandidates ?? []).not.toContain('Gallo')
  })

  it('only offers a misread or partial list hit', () => {
    const match = (text: string) => (/lo.sen/i.test(text) ? 'Weingut Dr. Loosen' : null)
    const misread = parse([['Weingut Dr. Lo0sen', 20], ['Riesling', 40]], match)
    expect(misread.winery).toEqual({ value: 'Weingut Dr. Loosen', sure: true })
    const shaky = parse([['Weingut Dr. Loosen', 20, 70], ['Riesling', 40]], match)
    expect(shaky.winery).toBeUndefined()
    expect(shaky.wineryCandidates?.[0]).toBe('Weingut Dr. Loosen')
    const partial = parse([['TRADITION', 30], ['PERE & FILS', 20, 90, { gap: 80 }]], (t) => (/fils/i.test(t) ? 'Bonot Père & Fils' : null))
    expect(partial.winery).toBeUndefined()
    expect(partial.wineryCandidates?.[0]).toBe('Bonot Père & Fils')
  })

  it('never fills in short or generic list hits', () => {
    const match = (text: string) => ({ DELTA: 'Delta', WANN: 'Weingut Wann', TRADITION: 'Weingut Tradition' })[text] ?? null
    for (const text of ['DELTA', 'WANN', 'TRADITION']) expect(parse([[text, 40], ['Riesling', 20]], match).winery).toBeUndefined()
  })

  it('fills in a one-word brand only as the clearly read headline', () => {
    const match = (text: string) => (/^cinzano$/i.test(text) ? 'Cinzano' : null)
    expect(parse([['CINZANO', 60, 92], ['Asti', 20]], match).winery).toEqual({ value: 'Cinzano', sure: true })
    expect(parse([['CINZANO', 60, 80], ['Asti', 20]], match).winery).toBeUndefined()
    expect(parse([['Asti Spumante', 60], ['CINZANO', 20]], match).winery).toBeUndefined()
  })

  it('never takes a vineyard or village in the list as the producer', () => {
    const match = (text: string) => (/^falkenstein$/i.test(text) ? 'Falkenstein' : null)
    const sites = [{ name: 'Falkenstein', village: 'Konz', region: 'Mosel' }]
    expect(parseLabel(stack([['FALKENSTEIN', 60], ['Riesling', 20]]), { matchWinery: match, sites }).winery).toBeUndefined()
  })

  it('never takes an appellation or grape in the list as the producer', () => {
    const match = (text: string) => (/bordeaux/i.test(text) ? 'Bordeaux' : /riesling/i.test(text) ? 'Riesling' : null)
    const appellations = [{ name: 'Bordeaux', country: 'FR' }]
    const result = parseLabel(stack([['BORDEAUX', 40], ['RIESLING', 20]]), { matchWinery: match, appellations })
    expect(result.winery).toBeUndefined()
  })

  it('asks the winery list about lines without a keyword and keeps them out of the name', () => {
    const match = (text: string) => (/^della luna$/i.test(text) ? 'Della Luna' : null)
    const result = parse([['DELLA LUNA', 30], ['Appassimento', 40, 90, { gap: 60 }]], match)
    expect(result.winery).toEqual({ value: 'Della Luna', sure: true })
    expect(result.nameCandidates).toEqual(['Appassimento'])
  })

  it('offers a short second headline as the producer', () => {
    const result = parse([['Sassicaia', 40], ['Bolgheri Sassicaia', 12, 90, { gap: 60 }], ['SAN GUIDO', 24, 90, { gap: 60 }]])
    expect(result.winery).toBeUndefined()
    expect(result.wineryCandidates).toEqual(['San Guido'])
  })
})

describe('name', () => {
  const appellations = [
    { name: "Montepulciano d'Abruzzo", country: 'IT' },
    { name: 'Primitivo di Manduria', country: 'IT' },
    { name: 'Bordeaux', country: 'FR' },
    { name: 'Chianti Classico', country: 'IT' },
    { name: 'Maremma Toscana', country: 'IT' },
    { name: 'Toscana', country: 'IT' },
    { name: 'Rioja', country: 'ES' },
    { name: 'Prosecco', country: 'IT', wineType: 'sparkling' as const },
    { name: 'Asti', country: 'IT', wineType: 'sparkling' as const },
    { name: 'Württemberg', country: 'DE' },
    { name: 'Mosel', country: 'DE' },
  ]
  const sites = [{ name: 'Goldtröpfchen', village: 'Piesport', region: 'Mosel' }]
  const parseWith = (specs: LineSpec[], matchWinery?: (text: string) => string | null) =>
    parseLabel(stack(specs), { currentYear: 2026, appellations, sites, matchWinery })

  it('fills in an appellation that makes up the headline', () => {
    expect(parseWith([['NTEPULCIANO', 40], ['D ABRUZZO', 40], ['DOC', 20]]).name).toEqual({ value: "Montepulciano d'Abruzzo", sure: true })
    expect(parseWith([['Chianti Classico DOCG 2019', 40]]).name).toEqual({ value: 'Chianti Classico', sure: true })
    expect(parseWith([['ROSSO', 30], ['MAREMMA TOSCANA', 40]]).name?.value).toBe('Maremma Toscana')
  })

  it('fills in a vineyard site with its village', () => {
    const result = parseWith([['Weingut Haart', 20], ['PIESPORTER GOLDTRÖPFCHEN', 40], ['Riesling Spätlese', 24]])
    expect(result.name).toEqual({ value: 'Piesporter Goldtröpfchen', sure: true })
    expect(result.nameCandidates ?? []).not.toContain('Piesporter Goldtröpfchen')
  })

  it('takes the appellation from the small print when no headline competes', () => {
    const result = parseWith([['PRIMITIVO', 40], ['Primitivo di Manduria Denominazione di Origine Controllata', 10]])
    expect(result.name).toEqual({ value: 'Primitivo di Manduria', sure: true })
  })

  it('only offers the appellation when a brand headline is bigger', () => {
    const result = parseWith([['TIGNANELLO', 50], ['Toscana', 20]])
    expect(result.name).toBeUndefined()
    expect(result.nameCandidates).toEqual(['Tignanello', 'Toscana'])
    expect(parseWith([['EL COTO', 50], ['Crianza 2014', 20], ['RIOJA', 20]]).name).toBeUndefined()
  })

  it('does not count the producer as a competing headline', () => {
    const result = parseWith([['BARON', 50], ['LESTAC', 50], ['BORDEAUX', 24], ['Élevé en fûts de chêne', 30]])
    expect(result.name).toEqual({ value: 'Bordeaux', sure: true })
    expect(result.wineryCandidates).toEqual(['Baron Lestac'])
  })

  it('keeps the end of a producer name out of the name and the grapes', () => {
    const lines: LineSpec[] = [['ROSSO', 40], ['CANTINA VIGNAIOLI DEL', 20, 90, { gap: 60 }], ['MORELLINO DI SCANSANO', 20]]
    const result = parseLabel(stack(lines), { appellations: [...appellations, { name: 'Morellino di Scansano', country: 'IT' }] })
    expect(result.name).toBeUndefined()
    expect(result.grapeVariety).toBeUndefined()
    expect(result.wineryCandidates).toEqual(['Cantina Vignaioli del Morellino di Scansano'])
  })

  it('never fills in a misread or partial appellation', () => {
    const list = [...appellations, { name: 'Corton', country: 'FR' }, { name: 'Cònero', country: 'IT' }]
    expect(parseLabel(stack([['EL COTON', 50]]), { appellations: list }).name).toBeUndefined()
    expect(parseLabel(stack([['EL CORTON', 50]]), { appellations: list }).name).toBeUndefined()
    expect(parseLabel(stack([['NE DI ORIGINE CONTRO', 20]]), { appellations: list }).name).toBeUndefined()
  })

  it('never fills in a Spanish appellation as the name: there the brand names the wine', () => {
    const result = parseWith([['RIOJA', 40], ['CALIFICADA', 12]])
    expect(result.name).toBeUndefined()
    expect(result.nameCandidates).toEqual(['Rioja'])
  })

  it('never fills in a German or Austrian region as the name', () => {
    const result = parseWith([['TROLLINGER', 40], ['WÜRTTEMBERG', 40]])
    expect(result.name).toBeUndefined()
    expect(result.nameCandidates).toEqual(['Trollinger'])
  })

  it('reads the wine type from the appellation, sure', () => {
    expect(parseWith([['Hausmarke', 40], ['Prosecco DOC', 14]]).wineType).toEqual({ value: 'sparkling', sure: true })
    expect(parseWith([['CINZANO', 40], ['ASTI', 20], ['D.O.C.G.', 10]]).wineType).toEqual({ value: 'sparkling', sure: true, from: 'origin' })
  })

  it('without the appellation list fills in a grape with its place', () => {
    expect(parse([['NTEPULCIANO', 40], ['D ABRUZZO', 40]]).name).toEqual({ value: "Montepulciano d'Abruzzo", sure: true })
  })

  it('offers other headlines as candidates, biggest first', () => {
    const result = parse([['Hausmarke', 20], ['Schieferterrassen', 40]])
    expect(result.name).toBeUndefined()
    expect(result.nameCandidates).toEqual(['Schieferterrassen', 'Hausmarke'])
  })

  it('offers a grape line under a big brand, and the brand as the producer', () => {
    const result = parse([['Villa', 45], ['ILONA', 40], ['GRÜNER VELTLINER', 25]])
    expect(result.nameCandidates).toEqual(['Grüner Veltliner'])
    expect(result.wineryCandidates).toEqual(['Villa Ilona'])
  })

  it('never offers a region or a founding note', () => {
    const result = parse([['SEIT', 50], ['6 WÜRTTEMBERG', 60], ['TROLLINGER', 40]])
    expect(result.nameCandidates).toEqual(['Trollinger'])
  })

  it('never offers a founding note', () => {
    expect(parse([['CINZANO', 60], ['CASA FONDATA NEL 1757', 30]]).nameCandidates).toEqual(['Cinzano'])
  })

  it('skips appellation and legal lines even when they are big', () => {
    const result = parse([
      ['Qualitätswein Pfalz', 60],
      ['Kirchberg', 40],
      ['enthält Sulfite', 50],
      ['13,0 % vol', 50],
      ['750 ml', 50],
      ['Product of Italy', 50],
    ])
    expect(result.nameCandidates).toEqual(['Kirchberg'])
  })

  it('merges two big lines that belong together', () => {
    expect(parse([['LUST &', 40], ['LAUNE', 40]]).nameCandidates).toEqual(['Lust & Laune'])
  })

  it('does not merge lines of clearly different size', () => {
    expect(parse([['LA CROIX BELLE', 30], ['CAMP DEL GAL', 20]]).nameCandidates).toEqual(['La Croix Belle', 'Camp del Gal'])
  })

  it('keeps & and apostrophes in Title Case', () => {
    expect(parse([['LUST & LAUNE', 40]]).nameCandidates?.[0]).toBe('Lust & Laune')
    expect(parse([["L'ARGENTIERA", 40]]).nameCandidates?.[0]).toBe("L'Argentiera")
  })

  it('keeps mixed case as printed', () => {
    expect(parse([['Riesling vom Kalkstein', 40]]).nameCandidates?.[0]).toBe('Riesling vom Kalkstein')
  })

  it('skips taste descriptions and running text', () => {
    const result = parse([
      ['SÜSS & FRUCHTIG', 50],
      ['I LEAVE MY BEST GRAPES ON THE VINE FOR A LATE HARVEST', 60],
      ['Innamorati', 30],
    ])
    expect(result.nameCandidates).toEqual(['Innamorati'])
  })

  it('never offers the winery line as a name', () => {
    expect(parse([['Weingut Keller', 60], ['Abtserde', 30]]).nameCandidates).toEqual(['Abtserde'])
  })

  it('rejects OCR debris: cut-off, consonant clusters, shaky short words', () => {
    const result = parse([
      ['chel', 103, 69],
      ['chi', 300, 89],
      ['mpos', 100, 77],
      ['rnfxk', 80, 90],
      ['SEKT FEINSTER KO', 100, 92],
    ])
    expect(result.nameCandidates).toEqual(['Sekt Feinster'])
  })

  it('offers at most three candidates', () => {
    const gap = { gap: 60 }
    const result = parse([['Alpha', 50], ['Bravo', 45, 90, gap], ['Charlie', 40, 90, gap], ['Delta', 35, 90, gap]])
    expect(result.nameCandidates).toEqual(['Alpha', 'Bravo', 'Charlie'])
  })

  it('stays within the field limit of 80 characters', () => {
    const long = 'Allerbeste Auswahl Großer Lagen Vom Steilen Hang Am Fluss Mit Viel Sonne Im Herbst'
    const value = parse([[long.split(' ').slice(0, 6).join(' '), 40], [long.split(' ').slice(6).join(' '), 40]]).nameCandidates?.[0]
    expect(value?.length).toBeLessThanOrEqual(80)
  })
})

describe('taste description', () => {
  it('offers a taste line for the description, in sentence case, and never as name or winery', () => {
    const result = parse([['Innamorati', 40], ['SÜSS & FRUCHTIG', 14]])
    expect(result.descriptionCandidates).toEqual(['Süß & fruchtig'])
    expect(result.nameCandidates).toEqual(['Innamorati'])
    expect(result.wineryCandidates).toBeUndefined()
    // The sweetness level is read from the same line, independently
    expect(result.sweetness).toEqual({ value: 'sweet', sure: true })
  })

  it('keeps a taste line without a known descriptor stem out of the name candidates', () => {
    const result = parse([['SÜFFIG & RUND', 40], ['Abtserde', 30]])
    expect(result.nameCandidates).toEqual(['Abtserde'])
    expect(result.descriptionCandidates).toEqual(['Süffig & rund'])
  })

  it('never takes a taste line as the producer, neither next to a keyword nor from the winery list', () => {
    const result = parse([['Abtserde', 40], ['WEINGUT', 20], ['SÜFFIG & RUND', 20]], (text) => (/suffig|süffig/i.test(text) ? 'Süffig & Rund' : null))
    expect(result.winery).toBeUndefined()
    expect(result.wineryCandidates ?? []).not.toContainEqual(expect.stringMatching(/süffig/i))
    expect(result.descriptionCandidates).toEqual(['Süffig & rund'])
  })

  it('offers taste lines in other languages too, at most three, the most prominent first', () => {
    const result = parse([
      ['Hausmarke', 40],
      ['Fruttato e morbido', 12],
      ['FRUITY & FRESH', 16],
      ['Fruité et souple', 10],
      ['Afrutado y suave', 9],
    ])
    expect(result.descriptionCandidates).toEqual(['Fruity & fresh', 'Fruttato e morbido', 'Fruité et souple'])
  })

  it('skips shaky readings, running text and lines that only state the sweetness', () => {
    const result = parse([
      ['Hausmarke', 40],
      ['fruchtig & frisch', 14, 40],
      ['Ein fruchtiger, frischer und sehr eleganter Wein mit Noten von Kirsche', 10],
      ['trocken', 14],
    ])
    expect(result.descriptionCandidates).toBeUndefined()
  })

  it('still offers a one-word headline as name, since the word may be the name ("VIVACE")', () => {
    const result = parse([['VIVACE', 40], ['Tenuta Rossi', 20]])
    expect(result.nameCandidates).toContain('Vivace')
    expect(result.descriptionCandidates).toEqual(['Vivace'])
  })

  it('never offers a line with a number as description', () => {
    const result = parse([['Hausmarke', 40], ['Fruchtig 2019', 14], ['12.5 fruchtig', 10]])
    expect(result.descriptionCandidates).toBeUndefined()
  })

  it('offers the same description only once', () => {
    const result = parse([['Hausmarke', 40], ['SÜSS & FRUCHTIG', 14], ['süß & fruchtig', 10]])
    expect(result.descriptionCandidates).toEqual(['Süß & fruchtig'])
  })
})
