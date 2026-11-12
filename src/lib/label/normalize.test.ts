import { describe, expect, it } from 'vitest'
import { cleanLine, displayCase, fold, foldText, isMostlyUpper, originalSlice, titleCase } from './normalize'

describe('fold', () => {
  it('lowercases, strips accents and expands ß', () => {
    expect(foldText('SÜSS & Rosé, Weißburgunder, Cœur')).toBe('suss & rose, weissburgunder, coeur')
  })

  it('maps folded positions back to the original text', () => {
    const text = 'Großes Gewächs'
    const f = fold(text)
    const start = f.folded.indexOf('gewachs')
    expect(originalSlice(text, f, start, start + 'gewachs'.length)).toBe('Gewächs')
    const s = f.folded.indexOf('grosses')
    expect(originalSlice(text, f, s, s + 'grosses'.length)).toBe('Großes')
  })
})

describe('cleanLine', () => {
  it('drops junk tokens and stray edge characters', () => {
    expect(cleanLine('i INNAMORATI ;')).toBe('INNAMORATI')
    expect(cleanLine('|| WEINBIET —')).toBe('WEINBIET')
    expect(cleanLine('  Lust   &  ')).toBe('Lust &')
  })

  it('normalizes apostrophes and the ampersand', () => {
    expect(cleanLine('D’ABRUZZO')).toBe("D'ABRUZZO")
    expect(cleanLine('LUST&LAUNE')).toBe('LUST & LAUNE')
    expect(cleanLine('D ABRUZZO')).toBe("D'ABRUZZO")
  })

  it('keeps abbreviations and digits', () => {
    expect(cleanLine('Dr. Loosen')).toBe('Dr. Loosen')
    expect(cleanLine('2024')).toBe('2024')
  })
})

describe('titleCase', () => {
  it('capitalizes words and lowercases particles inside a name', () => {
    expect(titleCase('CAMP DEL GAL')).toBe('Camp del Gal')
    expect(titleCase('CONTE DI CAMPIANO')).toBe('Conte di Campiano')
    expect(titleCase('TROLLINGER MIT LEMBERGER')).toBe('Trollinger mit Lemberger')
    expect(titleCase('DELLA LUNA')).toBe('Della Luna')
  })

  it('keeps ampersands, apostrophes and hyphens', () => {
    expect(titleCase('LUST & LAUNE')).toBe('Lust & Laune')
    expect(titleCase("MONTEPULCIANO D'ABRUZZO")).toBe("Montepulciano d'Abruzzo")
    expect(titleCase("L'ARGENTIERA")).toBe("L'Argentiera")
    expect(titleCase("ROBERT'S CHOICE")).toBe("Robert's Choice")
    expect(titleCase('MÜLLER-THURGAU')).toBe('Müller-Thurgau')
  })

  it('keeps wine acronyms and roman numerals', () => {
    expect(titleCase('CHIANTI DOCG')).toBe('Chianti DOCG')
    expect(titleCase('CUVÉE III')).toBe('Cuvée III')
  })
})

describe('displayCase', () => {
  it('only changes lines set in capitals', () => {
    expect(isMostlyUpper('INNAMORATI')).toBe(true)
    expect(displayCase('INNAMORATI')).toBe('Innamorati')
    expect(displayCase('Riesling vom Kalkstein')).toBe('Riesling vom Kalkstein')
    expect(displayCase('iPhone')).toBe('iPhone')
  })
})
