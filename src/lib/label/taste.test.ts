import { describe, expect, it } from 'vitest'
import { tasteDescription } from './taste'

describe('tasteDescription', () => {
  it.each([
    ['SÜSS & FRUCHTIG', 'Süß & fruchtig'],
    ['SUSS & FRUCHTIG', 'Süß & fruchtig'],
    ['süß & fruchtig', 'Süß & fruchtig'],
    ['fruchtig, frisch und mineralisch', 'Fruchtig, frisch und mineralisch'],
    ['WÜRZIG & KRÄFTIG', 'Würzig & kräftig'],
    ['KRAFTIG UND WURZIG', 'Kräftig und würzig'],
    ['Samtig & vollmundig', 'Samtig & vollmundig'],
    ['SÜFFIG & RUND', 'Süffig & rund'],
    ['ELEGANT, HARMONISCH', 'Elegant, harmonisch'],
    ['sehr fein und saftig', 'Sehr fein und saftig'],
    ['TROCKEN & AROMATISCH', 'Trocken & aromatisch'],
    ['FRUITY & FRESH', 'Fruity & fresh'],
    ['Crisp and juicy', 'Crisp and juicy'],
    ['SMOOTH & RICH', 'Smooth & rich'],
    ['FRUTTATO E MORBIDO', 'Fruttato e morbido'],
    ['Fresco e vellutato', 'Fresco e vellutato'],
    ['FRUITÉ ET SOUPLE', 'Fruité et souple'],
    ['FRUITE ET FRAIS', 'Fruité et frais'],
    ['AFRUTADO Y SUAVE', 'Afrutado y suave'],
  ])('%s → %s', (text, expected) => {
    expect(tasteDescription(text)).toBe(expected)
  })

  it('keeps inflected forms and restores their spelling', () => {
    expect(tasteDescription('WÜRZIGER & SAMTIGER')).toBe('Würziger & samtiger')
    expect(tasteDescription('FRESCA E FRUTTATA')).toBe('Fresca e fruttata')
    expect(tasteDescription('FRUITÉE')).toBe('Fruitée')
  })

  it('drops trailing punctuation', () => {
    expect(tasteDescription('Fruchtig!!!')).toBe('Fruchtig')
    expect(tasteDescription('Süß & fruchtig.')).toBe('Süß & fruchtig')
  })

  it('reads a misread taste word of seven letters or more as the word', () => {
    expect(tasteDescription('SUSS & FRUCHTIC')).toBe('Süß & fruchtig')
    expect(tasteDescription('Samtig & vollmundiq')).toBe('Samtig & vollmundig')
  })

  it('needs a word read as printed next to a misread one, and never takes a short name for a taste word', () => {
    expect(tasteDescription('Vollmundiq')).toBeNull()
    expect(tasteDescription('FRITSCH')).toBeNull()
    expect(tasteDescription('Frisch & Fritsch')).toBeNull()
  })

  it.each([
    ['trocken'],
    ['Lieblich'],
    ['Rotwein trocken'],
    ['Riesling fruchtig'],
    ['Lust & Laune'],
    ['Fruchtig, mit Noten von Kirsche'],
    ['& und'],
    [''],
    ['Fruchtig 2019'],
    ['100% fruchtig'],
    ['12.5 fruchtig'],
    ['Elegant 2019'],
    // German endings only on German words: "Fraise" is no "frais", "Lighter" no taste line
    ['Fraise'],
    ['Lighter'],
  ])('is no taste line: %s', (text) => {
    expect(tasteDescription(text)).toBeNull()
  })
})
