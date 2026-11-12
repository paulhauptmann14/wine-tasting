import { describe, expect, it } from 'vitest'
import { findAppellations, findSite, isStrongWineryMatch, type AppellationRef, type SiteRef } from './match-reference'

const appellations: AppellationRef[] = [
  { name: "Montepulciano d'Abruzzo", country: 'IT' },
  { name: 'Primitivo di Manduria', country: 'IT' },
  { name: 'Bordeaux', country: 'FR' },
  { name: 'Bordeaux supérieur', country: 'FR' },
  { name: 'Asti', country: 'IT', wineType: 'sparkling' },
  { name: "Barbera d'Asti", country: 'IT' },
  { name: 'Prosecco', country: 'IT', wineType: 'sparkling' },
  { name: 'Maremma Toscana', country: 'IT' },
  { name: 'Chianti Classico', country: 'IT' },
  { name: 'Chianti', country: 'IT' },
  { name: 'Württemberg', country: 'DE' },
]

const names = (text: string) => findAppellations(text, appellations).map((m) => m.ref.name)

describe('findAppellations', () => {
  it('finds an appellation regardless of case, accents and apostrophes', () => {
    expect(names("MONTEPULCIANO D'ABRUZZO")).toEqual(["Montepulciano d'Abruzzo"])
    expect(names('Montepulciano d Abruzzo DOC')).toEqual(["Montepulciano d'Abruzzo"])
    expect(names('BORDEAUX SUPERIEUR')).toEqual(['Bordeaux supérieur'])
  })

  it('prefers the longest appellation and does not report its parts', () => {
    expect(names("Barbera d'Asti")).toEqual(["Barbera d'Asti"])
    expect(names('Chianti Classico Riserva')).toEqual(['Chianti Classico'])
  })

  it('tolerates one misread letter in long words only', () => {
    expect(names('Primitivo di Mandurla')).toEqual(['Primitivo di Manduria'])
    expect(names('Bordeanx')).toEqual(['Bordeaux'])
    expect(names('Asto')).toEqual([])
    expect(findAppellations('EL COTON', [{ name: 'Corton', country: 'FR' }])).toEqual([])
    expect(findAppellations('contro', [{ name: 'Cònero', country: 'IT' }])).toEqual([])
  })

  it('counts the words next to the appellation that are not companions', () => {
    expect(findAppellations('Chianti Classico Riserva DOCG 2019', appellations)[0].extra).toBe(0)
    expect(findAppellations('Rosso Maremma Toscana', appellations)[0].extra).toBe(0)
    expect(findAppellations('El Bordeaux', appellations)[0].extra).toBe(1)
  })

  it('needs whole words', () => {
    expect(names('Fantasti')).toEqual([])
    expect(names('Chiantigiana')).toEqual([])
  })

  it('reports how much of the line the appellation covers', () => {
    const [full] = findAppellations('Bordeaux', appellations)
    expect(full.coverage).toBe(1)
    const [part] = findAppellations('Château Lestac Bordeaux', appellations)
    expect(part.coverage).toBeLessThan(0.5)
  })

  it('returns nothing without a list', () => {
    expect(findAppellations('Bordeaux', [])).toEqual([])
  })
})

const sites: SiteRef[] = [
  { name: 'Goldtröpfchen', village: 'Piesport', region: 'Mosel' },
  { name: 'Himmelreich', village: 'Zeltingen-Rachtig', region: 'Mosel' },
  { name: 'Hermannshöhle', village: 'Niederhausen an der Nahe', region: 'Nahe' },
  { name: 'Sonnenuhr', village: 'Wehlen', region: 'Mosel' },
  { name: 'Loibenberg', region: 'Wachau' },
  { name: 'Kirchberg', village: 'Hecklingen', region: 'Baden' },
]

describe('findSite', () => {
  it('finds village adjective plus site', () => {
    expect(findSite('PIESPORTER GOLDTRÖPFCHEN', sites)?.value).toBe('Piesporter Goldtröpfchen')
    expect(findSite('Zeltinger Himmelreich Riesling', sites)?.value).toBe('Zeltinger Himmelreich')
    expect(findSite('Niederhäuser Hermannshöhle', sites)?.value).toBe('Niederhäuser Hermannshöhle')
    expect(findSite('Wehlener Sonnenuhr Spätlese', sites)?.value).toBe('Wehlener Sonnenuhr')
  })

  it('finds a site after "Ried" or "Vigna"', () => {
    expect(findSite('RIED LOIBENBERG', sites)?.value).toBe('Ried Loibenberg')
  })

  it('does not take a bare site name or a site with the wrong village', () => {
    expect(findSite('Kirchberg', sites)).toBeNull()
    expect(findSite('Graacher Sonnenuhr', sites)).toBeNull()
    expect(findSite('Loibenberg', sites)).toBeNull()
  })
})

describe('isStrongWineryMatch', () => {
  it('accepts the same name with or without a winery keyword', () => {
    expect(isStrongWineryMatch('Weingut Dr. Loosen', 'WEINGUT DR. LOOSEN')).toBe(true)
    expect(isStrongWineryMatch('Weingut Schmitts Kinder', 'Schmitts Kinder')).toBe(true)
    expect(isStrongWineryMatch('Gallo Family Vineyards', 'Gallo FAMILY VINEYARDS')).toBe(true)
    expect(isStrongWineryMatch('Cinzano', 'CINZANO')).toBe(true)
  })

  it('tolerates one misread letter in long words', () => {
    expect(isStrongWineryMatch('Weingut Dr. Bürklin-Wolf', 'Dr. Burkiin-Wolf')).toBe(true)
  })

  it('rejects partial names, short names and extra words', () => {
    expect(isStrongWineryMatch('Gallo Family Vineyards', 'Gallo')).toBe(false)
    expect(isStrongWineryMatch('Delta', 'DELTA')).toBe(false)
    expect(isStrongWineryMatch('Weingut Wann', 'wann')).toBe(false)
    expect(isStrongWineryMatch('Weingut Tradition', 'TRADITION')).toBe(false)
    expect(isStrongWineryMatch('Della Luna', 'Delta Mt')).toBe(false)
    expect(isStrongWineryMatch('Weingut Müller', 'Müller Thurgau')).toBe(false)
  })
})
