import { describe, expect, it } from 'vitest'
import { alcoholInput, formatAlcohol, parseAlcoholText } from './alcohol'

describe('parseAlcoholText', () => {
  it('reads comma and dot, with or without "%" and "vol"', () => {
    expect(parseAlcoholText('13,5')).toBe(13.5)
    expect(parseAlcoholText('13.5')).toBe(13.5)
    expect(parseAlcoholText(' 12 % vol ')).toBe(12)
    expect(parseAlcoholText('12,5%vol.')).toBe(12.5)
    expect(parseAlcoholText('0,0')).toBe(0)
  })
  it('rounds to one decimal', () => {
    expect(parseAlcoholText('13,46')).toBe(13.5)
  })
  it('rejects text and values outside 0–25', () => {
    expect(parseAlcoholText('viel')).toBeNaN()
    expect(parseAlcoholText('25,1')).toBeNaN()
    expect(parseAlcoholText('-1')).toBeNaN()
    expect(parseAlcoholText('1,2,3')).toBeNaN()
  })
})

it('formats for display and for the form field in German', () => {
  expect(formatAlcohol(13.5)).toBe('13,5 % vol')
  expect(formatAlcohol(12)).toBe('12 % vol')
  expect(alcoholInput(13.5)).toBe('13,5')
  expect(alcoholInput(12)).toBe('12')
  expect(alcoholInput(null)).toBe('')
})
