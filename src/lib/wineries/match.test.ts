import { describe, expect, it } from 'vitest'
import { matchWinery, normalize, searchWineries } from './match'

const list = [
  'Weingut Dr. Loosen',
  'Weingut Josef Loosen',
  'WeinGut Benedict Loosen Erben',
  'Weingut Egon Müller - Scharzhof',
  'Weingut Dr. Bürklin-Wolf',
  'Domaine Weinbach',
  'Weingut Riesling Hof',
  'Winzerhof Schäfer',
  'Weingut Müller',
]

describe('normalize', () => {
  it('folds case, diacritics and punctuation', () => {
    expect(normalize('  Weingut Müller-Äpfel, Straße! ')).toBe('weingut muller apfel strasse')
  })
})

describe('matchWinery', () => {
  it('matches despite prefix, case and punctuation', () => {
    expect(matchWinery('DR. LOOSEN', list)).toBe('Weingut Dr. Loosen')
    expect(matchWinery('WEINGUT DR. LOOSEN MOSEL', list)).toBe('Weingut Dr. Loosen')
  })
  it('tolerates OCR noise and umlaut spellings', () => {
    expect(matchWinery('Dr. Burklin Wolf', list)).toBe('Weingut Dr. Bürklin-Wolf')
    expect(matchWinery('Dr. Bürkiin-Wolf', list)).toBe('Weingut Dr. Bürklin-Wolf')
    expect(matchWinery('Winzerhof Schaefer', list)).toBe('Winzerhof Schäfer')
  })
  it('picks the exact person, not just the shared surname', () => {
    expect(matchWinery('Egon Müller Scharzhof', list)).toBe('Weingut Egon Müller - Scharzhof')
    expect(matchWinery('Josef Loosen', list)).toBe('Weingut Josef Loosen')
  })
  it('returns null for generic words and unknown names', () => {
    expect(matchWinery('Riesling trocken', list)).toBeNull()
    expect(matchWinery('Weingut', list)).toBeNull()
    expect(matchWinery('Qualitätswein Mosel 2019', list)).toBeNull()
    expect(matchWinery('Weingut Hans Meier', list)).toBeNull()
    expect(matchWinery('', list)).toBeNull()
  })
})

describe('searchWineries', () => {
  it('finds by word prefix, best prefix matches first, limited', () => {
    expect(searchWineries('loo', list)[0]).toBe('Weingut Dr. Loosen')
    expect(searchWineries('weingut dr', list)).toContain('Weingut Dr. Bürklin-Wolf')
    expect(searchWineries('weingut', list, 3)).toHaveLength(3)
  })
  it('needs at least two characters and returns nothing otherwise', () => {
    expect(searchWineries('l', list)).toEqual([])
    expect(searchWineries('zzz', list)).toEqual([])
  })
})

it('does not read the grape Müller-Thurgau as winery Müller', () => {
  expect(matchWinery('Müller-Thurgau trocken', list)).toBeNull()
  expect(matchWinery('Weingut Müller', list)).toBe('Weingut Müller')
})

it('does not reduce a full person name to a bare surname entry', () => {
  expect(matchWinery('Egon Müller', list)).toBeNull()
})
