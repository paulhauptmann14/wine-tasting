import { describe, expect, it } from 'vitest'
import {
  adminLoginSchema,
  directionSchema,
  idSchema,
  createTastingSchema,
  joinSchema,
  parseRatingForm,
  wineSchema,
} from './validation'

const fd = (entries: Record<string, string>) => {
  const f = new FormData()
  for (const [k, v] of Object.entries(entries)) f.set(k, v)
  return f
}

describe('createTastingSchema', () => {
  const valid = { name: '  Weinabend 2026 ', blindTasting: true, preset: 'five', pin: '1234' }
  it('accepts and trims valid input', () => {
    expect(createTastingSchema.parse(valid)).toEqual({ ...valid, name: 'Weinabend 2026' })
  })
  it('rejects empty names, bad pins and unknown presets', () => {
    expect(createTastingSchema.safeParse({ ...valid, name: '   ' }).success).toBe(false)
    expect(createTastingSchema.safeParse({ ...valid, pin: '123' }).success).toBe(false)
    expect(createTastingSchema.safeParse({ ...valid, pin: '12a4' }).success).toBe(false)
    expect(createTastingSchema.safeParse({ ...valid, pin: '1234567890123' }).success).toBe(false)
    expect(createTastingSchema.safeParse({ ...valid, preset: 'fancy' }).success).toBe(false)
  })
})

describe('joinSchema', () => {
  it('trims names and limits length to 40', () => {
    expect(joinSchema.parse({ name: ' Paul ' })).toEqual({ name: 'Paul' })
    expect(joinSchema.safeParse({ name: 'x'.repeat(41) }).success).toBe(false)
    expect(joinSchema.safeParse({ name: '' }).success).toBe(false)
  })
})

describe('adminLoginSchema', () => {
  it('normalizes the code', () => {
    expect(adminLoginSchema.parse({ code: '7kx92p', pin: '1234' })).toEqual({ code: '7KX92P', pin: '1234' })
    expect(adminLoginSchema.safeParse({ code: 'nope', pin: '1234' }).success).toBe(false)
  })
})

describe('wineSchema', () => {
  const base = { name: 'Riesling', winery: '', vintage: '', grapeVariety: '', sweetness: '', wineType: 'white' }
  const error = (raw: Record<string, string>, field: string) => {
    const result = wineSchema.safeParse(raw)
    return result.success ? undefined : result.error.issues.find((i) => i.path[0] === field)?.message
  }

  it('maps empty optional fields to null', () => {
    expect(wineSchema.parse({ ...base, grapeVariety: ' ', winery: '  ' })).toEqual({
      name: 'Riesling', winery: null, vintage: null, grapeVariety: null, sweetness: null, wineType: 'white',
    })
  })
  it('requires a name', () => {
    expect(error({ ...base, name: '  ' }, 'name')).toBe('Bitte gib einen Namen ein.')
  })
  it('requires the wine type', () => {
    expect(error({ ...base, wineType: '' }, 'wineType')).toBe('Bitte wähle die Weinart.')
    expect(error({ ...base, wineType: 'blau' }, 'wineType')).toBe('Bitte wähle eine Weinart aus der Liste.')
    expect(wineSchema.parse({ ...base, wineType: 'rose' }).wineType).toBe('rose')
  })
  it('trims the optional winery, maps empty to null and caps it at 80 characters', () => {
    expect(wineSchema.parse({ ...base, winery: '  Dr. Loosen ' }).winery).toBe('Dr. Loosen')
    expect(wineSchema.parse({ ...base, winery: '' }).winery).toBeNull()
    expect(wineSchema.safeParse({ ...base, winery: 'x'.repeat(80) }).success).toBe(true)
    expect(error({ ...base, winery: 'x'.repeat(81) }, 'winery')).toBe('Maximal 80 Zeichen.')
  })
  it('parses vintage and validates its range', () => {
    expect(wineSchema.parse({ ...base, vintage: '2022' }).vintage).toBe(2022)
    expect(wineSchema.safeParse({ ...base, vintage: '1800' }).success).toBe(false)
    expect(wineSchema.safeParse({ ...base, vintage: 'abc' }).success).toBe(false)
  })
  it('accepts only the four sweetness levels', () => {
    expect(wineSchema.parse({ ...base, sweetness: 'off_dry' }).sweetness).toBe('off_dry')
    expect(wineSchema.safeParse({ ...base, sweetness: 'sauer' }).success).toBe(false)
  })
})

describe('parseRatingForm', () => {
  const criteria = [
    { id: 'a', scaleMin: 1, scaleMax: 5 },
    { id: 'b', scaleMin: 1, scaleMax: 5 },
  ]
  it('returns values and trimmed notes', () => {
    expect(parseRatingForm(fd({ c_a: '4', c_b: '5', notes: '  Apfel ' }), criteria)).toEqual({
      ok: true, values: { a: 4, b: 5 }, notes: 'Apfel',
    })
  })
  it('maps empty notes to null', () => {
    const r = parseRatingForm(fd({ c_a: '1', c_b: '2', notes: '' }), criteria)
    expect(r.ok && r.notes).toBeNull()
  })
  it('flags missing and out-of-range values', () => {
    const r = parseRatingForm(fd({ c_a: '6' }), criteria)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.fieldErrors).sort()).toEqual(['c_a', 'c_b'])
  })
  it('names the criteria that still need stars', () => {
    const named = [
      { id: 'a', name: 'Geruch', scaleMin: 1, scaleMax: 5 },
      { id: 'b', name: 'Geschmack', scaleMin: 1, scaleMax: 5 },
      { id: 'c', name: 'Abgang', scaleMin: 1, scaleMax: 5 },
    ]
    const message = (entries: Record<string, string>) => {
      const r = parseRatingForm(fd(entries), named)
      return r.ok ? null : r.message
    }
    expect(message({ c_a: '3', c_b: '', c_c: '4' })).toBe('Bei Geschmack fehlen noch Sterne.')
    expect(message({ c_a: '', c_b: '2', c_c: '4' })).toBe('Bei Geruch fehlen noch Sterne.')
    expect(message({ c_a: '', c_b: '', c_c: '4' })).toBe('Bei Geruch und Geschmack fehlen noch Sterne.')
    expect(message({})).toBe('Bei Geruch, Geschmack und Abgang fehlen noch Sterne.')
  })
  it('falls back to a generic message without criterion names', () => {
    const r = parseRatingForm(fd({ c_a: '1' }), criteria)
    if (!r.ok) expect(r.message).toBe('Bitte vergib für jedes Kriterium Sterne.')
    else throw new Error('expected failure')
  })
  it('reports too long notes on their own', () => {
    const r = parseRatingForm(fd({ c_a: '1', c_b: '2', notes: 'x'.repeat(1001) }), criteria)
    if (!r.ok) expect(r.message).toBe('Die Notiz ist zu lang. Maximal 1000 Zeichen.')
    else throw new Error('expected failure')
  })
})

describe('bound action arguments', () => {
  it('accepts only UUIDs as ids', () => {
    expect(idSchema.safeParse('6f1c1a5e-1111-4222-8333-944455556666').success).toBe(true)
    expect(idSchema.safeParse('not-a-uuid').success).toBe(false)
    expect(idSchema.safeParse(42).success).toBe(false)
  })
  it('accepts only up or down as direction', () => {
    expect(directionSchema.safeParse('up').success).toBe(true)
    expect(directionSchema.safeParse('sideways').success).toBe(false)
  })
})
