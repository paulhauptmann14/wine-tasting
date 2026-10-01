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
  const valid = { name: '  Weinabend 2026 ', blindTasting: true, preset: 'classic', pin: '1234' }
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
  it('maps empty optional fields to null', () => {
    expect(wineSchema.parse({ name: 'Riesling', vintage: '', grapeVariety: ' ' })).toEqual({
      name: 'Riesling', vintage: null, grapeVariety: null,
    })
  })
  it('parses vintage and validates its range', () => {
    expect(wineSchema.parse({ name: 'R', vintage: '2022', grapeVariety: 'Riesling' }).vintage).toBe(2022)
    expect(wineSchema.safeParse({ name: 'R', vintage: '1800', grapeVariety: '' }).success).toBe(false)
    expect(wineSchema.safeParse({ name: 'R', vintage: 'abc', grapeVariety: '' }).success).toBe(false)
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
