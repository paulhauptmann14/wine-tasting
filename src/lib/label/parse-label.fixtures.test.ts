// Realistic OCR output for five real labels (photos of the owner's bottles, low resolution),
// including the noise Tesseract produces on textures, logos and script fonts.
import { describe, expect, it } from 'vitest'
import { parseLabel } from './parse-label'
import type { LabelSuggestion, OcrLine } from './types'

const line = (text: string, confidence: number, x0: number, y0: number, x1: number, y1: number): OcrLine => ({
  text,
  confidence,
  bbox: { x0, y0, x1, y1 },
})

// Name and winery: the filled-in value or else the first suggestion to tap.
const values = (s: LabelSuggestion) => ({
  name: s.name?.value ?? s.nameCandidates?.[0] ?? null,
  winery: s.winery?.value ?? s.wineryCandidates?.[0] ?? null,
  vintage: s.vintage?.value ?? null,
  grapeVariety: s.grapeVariety?.value ?? null,
  wineType: s.wineType?.value ?? null,
  sweetness: s.sweetness?.value ?? null,
})

const appellations = [{ name: "Montepulciano d'Abruzzo", country: 'IT' }]

const parse = (lines: OcrLine[], matchWinery?: (text: string) => string | null) =>
  parseLabel(lines, { currentYear: 2026, matchWinery, appellations })

const appassimento = [
  line('@ &% ~', 40, 120, 60, 480, 140),
  line('Ee ae', 35, 200, 200, 420, 260),
  line('CONTE DI CAMPIANO', 82, 40, 450, 560, 485),
  line('THE ORIGINAL', 70, 230, 555, 380, 570),
  line('APPASSIMENTO', 88, 70, 580, 530, 625),
  line('APPASSIMENTO METHOD', 74, 190, 640, 420, 655),
  line('IS MY PASSION', 80, 160, 665, 450, 690),
  line('I LEAVE MY BEST GRAPES ON THE VINE FOR', 65, 90, 700, 520, 712),
  line('A LATE HARVEST AND THE RESULT IS', 60, 110, 716, 500, 728),
  line('A HIGH CONCENTRATION OF A UNIQUE', 58, 100, 732, 510, 744),
  line('JUICE AND THIS GIVES THE WINE MORE BODY', 62, 80, 748, 530, 760),
  line('AND ELEGANCE.', 60, 220, 764, 380, 776),
  line('LIKE NO OTHER', 78, 150, 790, 440, 812),
  line('Coll Ceagpie', 31, 330, 830, 520, 870),
]

const innamorati = [
  line('INNAMORATI', 85, 150, 60, 560, 100),
  line('SUSS & FRUCHTIC', 80, 220, 120, 500, 138),
  line('=~ ~~ —', 35, 40, 300, 600, 380),
  line('Wy ///', 40, 300, 420, 420, 470),
  line('WEINBIET', 90, 170, 930, 520, 1000),
  line('MANUFAKTUR', 77, 290, 1025, 410, 1040),
]

const dellaLuna = [
  line('Ss ===', 38, 40, 200, 470, 300),
  line('mmm', 42, 100, 500, 400, 540),
  line('MONTEPULCIANO', 86, 30, 1000, 480, 1040),
  line('D’ABRUZZO', 84, 30, 1048, 330, 1088),
  line('DENOMINAZIONE DI ORIGINE CONTROLLATA', 70, 30, 1100, 470, 1112),
  // Two OCR passes read the year differently.
  line('2O24', 66, 160, 1150, 260, 1180),
  line('2024', 80, 161, 1150, 259, 1180),
  line('DELLA LUNA', 61, 120, 1270, 330, 1296),
]

const lustUndLaune = [
  line('LUST &', 76, 300, 40, 470, 90),
  line('LAUNE', 70, 300, 95, 470, 145),
  line('Trollinger mit Lemberger', 88, 60, 200, 700, 240),
  line('Anmutig, mil fruchligem Pep', 45, 40, 290, 680, 325),
]

const laCroixBelle = [
  line('Ail ff', 25, 250, 60, 420, 160),
  line('LA CROIX BELLE', 90, 120, 230, 560, 275),
  line('CAMP DEL GAL', 85, 200, 300, 480, 332),
  line('Ss', 30, 300, 400, 400, 500),
  line('MIS EN BOUTEILLE AU DOMAINE', 74, 130, 560, 540, 575),
]

describe('real labels', () => {
  it('Appassimento by Conte di Campiano', () => {
    const result = parse(appassimento)
    expect(values(result)).toEqual({
      name: 'Appassimento',
      winery: 'Conte di Campiano',
      vintage: null,
      grapeVariety: null,
      wineType: 'red',
      sweetness: null,
    })
    expect(result.wineType?.sure).toBe(false)
    expect(result.name).toBeUndefined()
    expect(result.winery).toBeUndefined()
  })

  it('Appassimento with a misread winery line fixed by the winery list', () => {
    const lines = appassimento.map((l) => (l.text === 'CONTE DI CAMPIANO' ? { ...l, text: 'CONTE pi CAMPIANO', confidence: 64 } : l))
    const match = (text: string) => (/c.mpiano/i.test(text) ? 'Conte di Campiano' : null)
    const result = parse(lines, match)
    expect(result.winery).toBeUndefined()
    expect(result.wineryCandidates?.[0]).toBe('Conte di Campiano')
    expect(result.listedWineries).toEqual(['Conte di Campiano'])
    expect(result.nameCandidates?.[0]).toBe('Appassimento')
  })

  it('Innamorati by Weinbiet Manufaktur, süß & fruchtig', () => {
    const result = parse(innamorati)
    expect(values(result)).toEqual({
      name: 'Innamorati',
      winery: 'Weinbiet Manufaktur',
      vintage: null,
      grapeVariety: null,
      wineType: null,
      sweetness: 'sweet',
    })
    expect(result.name).toBeUndefined()
    expect(result.sweetness?.sure).toBe(true)
  })

  it("Montepulciano d'Abruzzo DOC 2024 by Della Luna", () => {
    const result = parse(dellaLuna)
    expect(values(result)).toEqual({
      name: "Montepulciano d'Abruzzo",
      // "DELLA LUNA" is read with 61 % only: rather nothing than a shaky producer.
      winery: null,
      vintage: 2024,
      grapeVariety: 'Montepulciano',
      wineType: 'red',
      sweetness: null,
    })
    expect(result.name).toEqual({ value: "Montepulciano d'Abruzzo", sure: true })
    expect(result.vintage?.sure).toBe(true)
    expect(result.winery).toBeUndefined()
    expect(result.wineType?.sure).toBe(false)
  })

  it('Lust & Laune Trollinger mit Lemberger', () => {
    const result = parse(lustUndLaune)
    expect(values(result)).toEqual({
      name: 'Lust & Laune Trollinger mit Lemberger',
      winery: null,
      vintage: null,
      grapeVariety: 'Trollinger, Lemberger',
      wineType: 'red',
      sweetness: null,
    })
    expect(result.name).toBeUndefined()
  })

  it('Camp del Gal by La Croix Belle, mis en bouteille au domaine', () => {
    const result = parse(laCroixBelle)
    expect(values(result)).toEqual({
      name: 'Camp del Gal',
      winery: 'La Croix Belle',
      vintage: null,
      grapeVariety: null,
      wineType: null,
      sweetness: null,
    })
    expect(result.name).toBeUndefined()
    expect(result.winery).toBeUndefined()
  })
})
