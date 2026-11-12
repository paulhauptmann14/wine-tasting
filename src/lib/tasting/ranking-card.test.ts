import { describe, expect, it } from 'vitest'
import { CARD_CHAR, MAX_CARD_ROWS, cardText, fitDetails, rankingCard, rankingImageFilename } from './ranking-card'
import { computeResults, type ResultsInput } from './results'

const wine = (id: string, position: number, name = `Wein ${id}`) => ({
  id, position, name, winery: null as string | null, vintage: 2020, grapeVariety: 'Riesling', sweetness: 'dry' as const, wineType: 'white' as const,
  description: null as string | null,
  alcohol: null as number | null,
})
const criteria = [{ id: 'c1', name: 'Gesamt', position: 1, weight: 1 }]
const rate = (wineId: string, value: number, participantId = 'p1') => ({ participantId, wineId, values: { c1: value } })

function results(partial: Partial<ResultsInput>) {
  return computeResults({ wines: [], criteria, ratings: [], revealNames: true, ...partial })
}

const meta = {
  tastingName: 'Weinabend bei Paul',
  guestCount: 3,
  date: new Date('2026-11-11T20:00:00Z'),
}

describe('rankingCard', () => {
  it('puts the top three on the podium and the rest in rows, with scaled scores', () => {
    const r = results({
      wines: [wine('a', 1), wine('b', 2), wine('c', 3), wine('d', 4, 'Spätburgunder')],
      ratings: [rate('a', 2), rate('b', 5), rate('c', 4), rate('d', 3)],
    })
    const card = rankingCard(r, 'twenty', meta)
    expect(card.podium.map((w) => [w.rank, w.name, w.score])).toEqual([
      [1, 'Wein b', '20,0'],
      [2, 'Wein c', '16,0'],
      [3, 'Spätburgunder', '12,0'],
    ])
    expect(card.rest.map((w) => [w.rank, w.name, w.score])).toEqual([[4, 'Wein a', '8,0']])
    expect(card.podium[0]).toMatchObject({ position: 2, details: 'Weißwein · 2020 · Riesling · trocken' })
    expect(card.maxLabel).toBe('von 20')
    expect(card.maxScore).toBe('20,0')
    expect(card.hiddenCount).toBe(0)
  })

  it('formats title, date and footer', () => {
    const card = rankingCard(results({}), 'five', meta)
    expect(card.title).toBe('Weinabend bei Paul')
    expect(card.date).toBe('11. November 2026')
    // From the scale, not a preset: "Einfach" and "5-Punkte-Schema" both use five points
    expect(card.footer).toBe('5-Punkte-Skala · 3 Gäste')
    expect(rankingCard(results({}), 'hundred', { ...meta, guestCount: 1 }).footer).toBe('100-Punkte-Skala · 1 Gast')
  })

  it('leaves out unrated wines', () => {
    const r = results({ wines: [wine('a', 1), wine('b', 2)], ratings: [rate('b', 3)] })
    const card = rankingCard(r, 'five', meta)
    expect(card.podium.map((w) => w.name)).toEqual(['Wein b'])
    expect(card.rest).toEqual([])
    expect(card.hiddenCount).toBe(0)
  })

  it('is empty when nothing was rated', () => {
    const card = rankingCard(results({ wines: [wine('a', 1)] }), 'five', meta)
    expect(card.podium).toEqual([])
    expect(card.rest).toEqual([])
  })

  it('handles a single wine', () => {
    const card = rankingCard(results({ wines: [wine('a', 1)], ratings: [rate('a', 4)] }), 'hundred', meta)
    expect(card.podium).toHaveLength(1)
    expect(card.podium[0]).toMatchObject({ rank: 1, score: '90' })
    expect(card.maxLabel).toBe('von 100')
    expect(card.maxScore).toBe('100')
  })

  it('keeps equal rank numbers for ties', () => {
    const r = results({
      wines: [wine('a', 1), wine('b', 2), wine('c', 3), wine('d', 4)],
      ratings: [rate('a', 4), rate('b', 4), rate('c', 3), rate('d', 3)],
    })
    const card = rankingCard(r, 'five', meta)
    expect(card.podium.map((w) => w.rank)).toEqual([1, 1, 3])
    expect(card.rest.map((w) => w.rank)).toEqual([3])
  })

  it(`caps the image at ${MAX_CARD_ROWS} wines and counts the rest`, () => {
    const wines = Array.from({ length: MAX_CARD_ROWS + 4 }, (_, i) => wine(`w${i}`, i + 1))
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i * 0.25)) })
    const card = rankingCard(r, 'five', meta)
    expect(card.podium.length + card.rest.length).toBe(MAX_CARD_ROWS)
    expect(card.hiddenCount).toBe(4)
  })

  it('truncates very long names and titles at a word boundary', () => {
    const long = 'Château de la Grande Réserve Vieilles Vignes Cuvée Prestige'
    const r = results({ wines: [wine('a', 1, long)], ratings: [rate('a', 4)] })
    const card = rankingCard(r, 'five', { ...meta, tastingName: 'Großer Herbstabend bei Jürgen & Bärbel – Württemberger Lagen' })
    expect(card.podium[0].name).toBe('Château de la Grande Réserve Vieilles…')
    expect(card.title).toBe('Großer Herbstabend bei Jürgen & Bärbel…')
  })

  it('cuts mid-word only when there is no break nearby', () => {
    const r = results({ wines: [wine('a', 1, 'Trockenbeerenauslesekabinettsweinbergslage')], ratings: [rate('a', 4)] })
    expect(rankingCard(r, 'five', meta).podium[0].name).toBe('Trockenbeerenauslesekabinettsweinberg…')
  })

  it('gives each slot its own name budget', () => {
    const names = ['Château Mouton-Rothschild Pauillac Premier', 'Grauburgunder Spätlese vom Kaiserstuhl', 'Wein c']
    const wines = names.map((name, i) => wine(`w${i}`, i + 1, name)).concat(wine('d', 4))
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i * 0.5)) })
    const card = rankingCard(r, 'five', meta)
    expect(card.layout).toBe('roomy')
    expect(card.podium[0].name).toBe('Château Mouton-Rothschild Pauillac…')
    expect(card.podium[1].name).toBe('Grauburgunder Spätlese…')
  })

  it('picks the layout by the number of rows', () => {
    const card = (count: number) => {
      const wines = Array.from({ length: count }, (_, i) => wine(`w${i}`, i + 1))
      return rankingCard(results({ wines, ratings: wines.map((w) => rate(w.id, 3)) }), 'five', meta)
    }
    expect([1, 3, 4, 6, 7, 12].map((n) => card(n).layout)).toEqual(['stacked', 'stacked', 'roomy', 'roomy', 'compact', 'compact'])
  })

  it('shortens details by whole parts so each slot stays on one line', () => {
    const long = 'Château de la Grande Réserve Vieilles Vignes'
    const wines = [wine('a', 1), wine('b', 2), wine('c', 3), wine('d', 4, long), wine('e', 5, 'Silvaner')]
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i * 0.5)) })
    const card = rankingCard(r, 'five', meta)
    expect(card.podium[0].details).toBe('Weißwein · 2020 · Riesling · trocken')
    expect(card.podium[1].details).toBe('Weißwein · 2020')
    expect(card.rest[0].details).toBe('Weißwein · 2020')
    expect(card.rest[1].details).toBe('Weißwein · 2020 · Riesling · trocken')
  })

  it('puts the winery in front of the details and drops it as a whole part when it does not fit', () => {
    const wines = [
      { ...wine('a', 1), winery: 'Dr. Loosen' },
      { ...wine('b', 2), winery: 'Weingut der Fürstlich Castell\'schen Domänenverwaltung' },
    ]
    const r = results({ wines, ratings: [rate('a', 5), rate('b', 4)] })
    const card = rankingCard(r, 'five', meta)
    // 48 characters per slot: the last whole part makes room for the winery
    expect(card.podium[0].details).toBe('Dr. Loosen · Weißwein · 2020 · Riesling')
    // Too long to fit on one line: the winery goes, the rest stays
    expect(card.podium[1].details).toBe('Weißwein · 2020 · Riesling · trocken')
    expect(fitDetails('Weingut Dr. Loosen · Weißwein · 2020', 30)).toBe('Weingut Dr. Loosen · Weißwein')
  })

  it('leaves the taste description off the image', () => {
    const r = results({ wines: [{ ...wine('a', 1), description: 'Süß & fruchtig' }], ratings: [rate('a', 4)] })
    const card = rankingCard(r, 'five', meta)
    expect(card.podium[0].details).toBe('Weißwein · 2020 · Riesling · trocken')
    expect(JSON.stringify(card)).not.toContain('fruchtig')
  })

  it('never puts the winery on the image when names are hidden', () => {
    const r = computeResults({ wines: [{ ...wine('a', 4), winery: 'Geheimes Weingut' }], criteria, ratings: [rate('a', 4)], revealNames: false })
    expect(JSON.stringify(rankingCard(r, 'five', meta))).not.toContain('Geheimes')
  })

  it('falls back to the wine number when names are hidden', () => {
    const r = computeResults({ wines: [wine('a', 4)], criteria, ratings: [rate('a', 4)], revealNames: false })
    const card = rankingCard(r, 'five', meta)
    expect(card.podium[0]).toMatchObject({ name: 'Wein #4', details: null })
  })

  it('only keeps characters the bundled fonts can draw, so the renderer never fetches fonts', () => {
    const wines = [
      wine('a', 1, 'Graševina Kutjevo 🍷'),
      wine('b', 2, 'Саперави'),
      { ...wine('c', 3, 'Łącko\nWino'), grapeVariety: 'Ξινόμαυρο' },
    ]
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i)) })
    const card = rankingCard(r, 'five', { ...meta, tastingName: 'Weinabend 🍷 bei Paul' })
    expect(card.title).toBe('Weinabend bei Paul')
    expect(card.podium.map((w) => w.name)).toEqual(['Grasevina Kutjevo', 'Wein #2', 'Lacko Wino'])
    expect(card.podium[2].details).toBe('Weißwein · 2020 · trocken')
    const texts = [card.title, card.date, card.footer, card.maxLabel, card.maxScore, ...card.podium.flatMap((w) => [w.name, w.details ?? '', w.score])]
    for (const text of texts) for (const c of text) expect(c, text).toMatch(CARD_CHAR)
  })

  it('falls back to a neutral title when nothing drawable is left', () => {
    expect(rankingCard(results({}), 'five', { ...meta, tastingName: 'Вечер вина' }).title).toBe('Unsere Weinprobe')
  })
})

describe('cardText', () => {
  it('keeps German text and typography untouched', () => {
    expect(cardText('Süße „Grüße“ – Spätlese 2019 · 12 € …')).toBe('Süße „Grüße“ – Spätlese 2019 · 12 € …')
  })

  it('composes decomposed umlauts instead of dropping them', () => {
    expect(cardText('Grüße'.normalize('NFD'))).toBe('Grüße')
  })
})

describe('fitDetails', () => {
  it('keeps leading parts that fit', () => {
    expect(fitDetails('Rotwein · 2019 · Pinot Noir', 14)).toBe('Rotwein · 2019')
    expect(fitDetails('Rotwein · 2019', 40)).toBe('Rotwein · 2019')
    expect(fitDetails('Schaumwein', 5)).toBeNull()
    expect(fitDetails(null, 40)).toBeNull()
    // Only the first part (the winery) may be skipped; a too-long later part stops the fitting
    expect(fitDetails('Weingut Dr. Loosen · Weißwein · 2020', 12)).toBe('Weißwein')
    expect(fitDetails('Weingut Dr. Loosen · Weißwein · 2020', 7)).toBeNull()
  })
})

describe('rankingImageFilename', () => {
  it('builds an ASCII slug from the tasting name', () => {
    expect(rankingImageFilename('Weinabend bei Paul')).toBe('weinabend-bei-paul-ergebnis.png')
    expect(rankingImageFilename('Süße Grüße aus Öhringen – Straße')).toBe('suesse-gruesse-aus-oehringen-strasse-ergebnis.png')
    expect(rankingImageFilename('Château Côte  Rôtie!')).toBe('chateau-cote-rotie-ergebnis.png')
  })

  it('falls back when nothing usable is left', () => {
    expect(rankingImageFilename('')).toBe('wine-tasting-ergebnis.png')
    expect(rankingImageFilename('🍷 !!! 🍷')).toBe('wine-tasting-ergebnis.png')
  })

  it('keeps the slug short', () => {
    const name = rankingImageFilename('a'.repeat(30) + ' ' + 'b'.repeat(80))
    expect(name.length).toBeLessThanOrEqual(60 + '-ergebnis.png'.length)
    expect(name).not.toMatch(/--/)
  })
})
