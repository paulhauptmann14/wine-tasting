import { describe, expect, it } from 'vitest'
import { readableCase } from './readable-case'

describe('readableCase', () => {
  it('turns ALL-CAPS lines into Title Case', () => {
    expect(readableCase('LA CROIX BELLE')).toBe('La Croix Belle')
    expect(readableCase('BLAUSCHIEFER')).toBe('Blauschiefer')
    expect(readableCase('DR. LOOSEN')).toBe('Dr. Loosen')
    expect(readableCase('GRÜNER VELTLINER')).toBe('Grüner Veltliner')
  })

  it('keeps small connecting words lower, except at the start', () => {
    expect(readableCase('CAMP DEL GAL')).toBe('Camp del Gal')
    expect(readableCase('CONTE DI CAMPIANO')).toBe('Conte di Campiano')
    expect(readableCase('DOMAINE DE LA CROIX')).toBe('Domaine de la Croix')
    expect(readableCase('PERE & FILS')).toBe('Pere & Fils')
    expect(readableCase('DEL GAL')).toBe('Del Gal')
  })

  it('handles elisions with an apostrophe', () => {
    expect(readableCase("CHÂTEAU D'YQUEM")).toBe("Château d'Yquem")
    expect(readableCase('CHÂTEAU D’YQUEM')).toBe('Château d’Yquem')
    expect(readableCase("D'ALBOLA")).toBe("D'Albola")
    expect(readableCase("CLOS L'ABBAYE")).toBe("Clos l'Abbaye")
  })

  it('capitalizes every part of a hyphenated name and each initial', () => {
    expect(readableCase('SAINT-EMILION')).toBe('Saint-Emilion')
    expect(readableCase('J. J. PRÜM')).toBe('J. J. Prüm')
  })

  it('keeps well-known acronyms upper case', () => {
    expect(readableCase('CAVE DE TAIN SA')).toBe('Cave de Tain SA')
    expect(readableCase('ROSSO DOC')).toBe('Rosso DOC')
  })

  it('keeps elided Italian articles lower and dotted acronyms upper case', () => {
    expect(readableCase("TENUTA DELL'ORNELLAIA")).toBe("Tenuta dell'Ornellaia")
    expect(readableCase('CAVE DE TAIN S.A.')).toBe('Cave de Tain S.A.')
    expect(readableCase('CÔTES DU RHÔNE A.O.C.')).toBe('Côtes du Rhône A.O.C.')
    expect(readableCase('BODEGAS EL NIDO')).toBe('Bodegas El Nido')
  })

  it('leaves text that already has lower case letters alone', () => {
    expect(readableCase('Camp del Gal')).toBe('Camp del Gal')
    expect(readableCase('CONTE pi CAMPIANO')).toBe('CONTE pi CAMPIANO')
    expect(readableCase('Weingut Dr. Loosen')).toBe('Weingut Dr. Loosen')
  })

  it('collapses whitespace and survives empty or letterless input', () => {
    expect(readableCase('  LA   CROIX  ')).toBe('La Croix')
    expect(readableCase('')).toBe('')
    expect(readableCase('1855')).toBe('1855')
  })
})
