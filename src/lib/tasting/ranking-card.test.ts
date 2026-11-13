import { describe, expect, it } from 'vitest'
import {
  CARD_CHAR,
  CONTINUATION_ROWS,
  MAX_ROW_NAME,
  cardText,
  fitDetails,
  rankingCards,
  rankingImageCount,
  rankingImageFilename,
  rankingImageUrl,
} from './ranking-card'
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

describe('rankingCards', () => {
  it('puts the top three on the podium and the rest in rows, with scaled scores', () => {
    const r = results({
      wines: [wine('a', 1), wine('b', 2), wine('c', 3), wine('d', 4, 'Spätburgunder')],
      ratings: [rate('a', 2), rate('b', 5), rate('c', 4), rate('d', 3)],
    })
    const card = rankingCards(r, 'twenty', meta)[0]
    expect(card.podium.map((w) => [w.rank, w.name, w.score])).toEqual([
      [1, 'Wein b', '20,0'],
      [2, 'Wein c', '16,0'],
      [3, 'Spätburgunder', '12,0'],
    ])
    expect(card.rest.map((w) => [w.rank, w.name, w.score])).toEqual([[4, 'Wein a', '8,0']])
    expect(card.podium[0]).toMatchObject({ position: 2, details: 'Weißwein · 2020 · Riesling · trocken' })
    expect(card.maxLabel).toBe('von 20')
    expect(card.maxScore).toBe('20,0')
  })

  it('formats title, date and footer', () => {
    const card = rankingCards(results({}), 'five', meta)[0]
    expect(card.title).toBe('Weinabend bei Paul')
    expect(card.date).toBe('11. November 2026')
    // From the scale, not a preset: "Einfach" and "5-Punkte-Schema" both use five points
    expect(card.footer).toBe('5-Punkte-Skala · 3 Gäste')
    expect(rankingCards(results({}), 'hundred', { ...meta, guestCount: 1 })[0].footer).toBe('100-Punkte-Skala · 1 Gast')
  })

  it('keeps unrated wines at the end', () => {
    const wines = Array.from({ length: 6 }, (_, i) => wine(`w${i}`, i + 1))
    const r = results({ wines, ratings: wines.slice(0, 4).map((w, i) => rate(w.id, 5 - i * 0.5)) })
    const card = rankingCards(r, 'five', meta)[0]
    expect(card.rest.map((w) => [w.name, w.rank, w.score])).toEqual([['Wein w3', 4, '3,5'], ['Wein w4', null, '–'], ['Wein w5', null, '–']])
    expect(card.rest[1].details).toBe('Weißwein · 2020 · Riesling · trocken')
  })

  it('never puts an unrated wine on the podium', () => {
    const wines = Array.from({ length: 12 }, (_, i) => wine(`w${i}`, i + 1))
    const r = results({ wines, ratings: [rate('w0', 5), rate('w1', 4)] })
    const card = rankingCards(r, 'five', meta)[0]
    expect(card.podium.map((w) => w.name)).toEqual(['Wein w0', 'Wein w1'])
    expect(card.rest[0]).toMatchObject({ name: 'Wein w2', rank: null, score: '–' })
  })

  it('lists wines nobody rated as rows, not on the podium', () => {
    const card = rankingCards(results({ wines: [wine('a', 1)] }), 'five', meta)[0]
    expect(card.podium).toEqual([])
    expect(card.rest.map((w) => [w.rank, w.score])).toEqual([[null, '–']])
  })

  it('handles a single wine', () => {
    const card = rankingCards(results({ wines: [wine('a', 1)], ratings: [rate('a', 4)] }), 'hundred', meta)[0]
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
    const card = rankingCards(r, 'five', meta)[0]
    expect(card.podium.map((w) => w.rank)).toEqual([1, 1, 3])
    expect(card.rest.map((w) => w.rank)).toEqual([3])
  })

  it('keeps tied ranks across images', () => {
    const wines = Array.from({ length: 12 }, (_, i) => wine(`w${i}`, i + 1))
    // 12 wines → rows 5 + 4: the last row of image 1 (list entry 8) ties with the first row of image 2
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, i === 8 ? 5 - 7 * 0.25 : 5 - i * 0.25)) })
    const cards = rankingCards(r, 'five', meta)
    expect(cards).toHaveLength(2)
    expect(cards[0].rest.at(-1)?.rank).toBe(8)
    expect(cards[1].rest[0].rank).toBe(8)
  })

  it('shortens follow-up rows like rows on image 1', () => {
    const wines = Array.from({ length: 12 }, (_, i) => wine(`w${i}`, i + 1, i === 11 ? 'x'.repeat(80) : undefined))
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i * 0.25)) })
    const [first, second] = rankingCards(r, 'five', meta)
    expect(Array.from(second.rest.at(-1)!.name)).toHaveLength(MAX_ROW_NAME)
    expect(second.rest.at(-1)!.name.endsWith('…')).toBe(true)
    expect(first.rest.every((w) => w.name.length < MAX_ROW_NAME)).toBe(true)
  })

  it('truncates very long names and titles at a word boundary', () => {
    const long = 'Château de la Grande Réserve Vieilles Vignes Cuvée Prestige'
    const r = results({ wines: [wine('a', 1, long)], ratings: [rate('a', 4)] })
    const card = rankingCards(r, 'five', { ...meta, tastingName: 'Großer Herbstabend bei Jürgen & Bärbel – Württemberger Lagen' })[0]
    expect(card.podium[0].name).toBe('Château de la Grande Réserve Vieilles…')
    expect(card.title).toBe('Großer Herbstabend bei Jürgen & Bärbel…')
  })

  it('cuts mid-word only when there is no break nearby', () => {
    const r = results({ wines: [wine('a', 1, 'Trockenbeerenauslesekabinettsweinbergslage')], ratings: [rate('a', 4)] })
    expect(rankingCards(r, 'five', meta)[0].podium[0].name).toBe('Trockenbeerenauslesekabinettsweinberg…')
  })

  it('gives each slot its own name budget', () => {
    const names = ['Château Mouton-Rothschild Pauillac Premier', 'Grauburgunder Spätlese vom Kaiserstuhl', 'Wein c']
    const wines = names.map((name, i) => wine(`w${i}`, i + 1, name)).concat(wine('d', 4))
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i * 0.5)) })
    const card = rankingCards(r, 'five', meta)[0]
    expect(card.layout).toBe('roomy')
    expect(card.podium[0].name).toBe('Château Mouton-Rothschild Pauillac…')
    expect(card.podium[1].name).toBe('Grauburgunder Spätlese…')
  })

  it('picks the layout by the number of rows', () => {
    const card = (count: number) => {
      const wines = Array.from({ length: count }, (_, i) => wine(`w${i}`, i + 1))
      return rankingCards(results({ wines, ratings: wines.map((w) => rate(w.id, 3)) }), 'five', meta)[0]
    }
    expect([1, 3, 4, 6, 7, 12].map((n) => card(n).layout)).toEqual(['stacked', 'stacked', 'roomy', 'roomy', 'compact', 'compact'])
  })

  it('shortens details by whole parts so each slot stays on one line', () => {
    const long = 'Château de la Grande Réserve Vieilles Vignes'
    const wines = [wine('a', 1), wine('b', 2), wine('c', 3), wine('d', 4, long), wine('e', 5, 'Silvaner')]
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i * 0.5)) })
    const card = rankingCards(r, 'five', meta)[0]
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
    const card = rankingCards(r, 'five', meta)[0]
    // 48 characters per slot: the last whole part makes room for the winery
    expect(card.podium[0].details).toBe('Dr. Loosen · Weißwein · 2020 · Riesling')
    // Too long to fit on one line: the winery goes, the rest stays
    expect(card.podium[1].details).toBe('Weißwein · 2020 · Riesling · trocken')
    expect(fitDetails('Weingut Dr. Loosen · Weißwein · 2020', 30)).toBe('Weingut Dr. Loosen · Weißwein')
  })

  it('leaves the taste description off the image', () => {
    const r = results({ wines: [{ ...wine('a', 1), description: 'Süß & fruchtig' }], ratings: [rate('a', 4)] })
    const card = rankingCards(r, 'five', meta)[0]
    expect(card.podium[0].details).toBe('Weißwein · 2020 · Riesling · trocken')
    expect(JSON.stringify(card)).not.toContain('fruchtig')
  })

  it('never puts the winery on the image when names are hidden', () => {
    const r = computeResults({ wines: [{ ...wine('a', 4), winery: 'Geheimes Weingut' }], criteria, ratings: [rate('a', 4)], revealNames: false })
    expect(JSON.stringify(rankingCards(r, 'five', meta)[0])).not.toContain('Geheimes')
  })

  it('falls back to the wine number when names are hidden', () => {
    const r = computeResults({ wines: [wine('a', 4)], criteria, ratings: [rate('a', 4)], revealNames: false })
    const card = rankingCards(r, 'five', meta)[0]
    expect(card.podium[0]).toMatchObject({ name: 'Wein #4', details: null })
  })

  it('only keeps characters the bundled fonts can draw, so the renderer never fetches fonts', () => {
    const wines = [
      wine('a', 1, 'Graševina Kutjevo 🍷'),
      wine('b', 2, 'Саперави'),
      { ...wine('c', 3, 'Łącko\nWino'), grapeVariety: 'Ξινόμαυρο' },
    ]
    const r = results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i)) })
    const card = rankingCards(r, 'five', { ...meta, tastingName: 'Weinabend 🍷 bei Paul' })[0]
    expect(card.title).toBe('Weinabend bei Paul')
    expect(card.podium.map((w) => w.name)).toEqual(['Grasevina Kutjevo', 'Wein #2', 'Lacko Wino'])
    expect(card.podium[2].details).toBe('Weißwein · 2020 · trocken')
    const texts = [card.title, card.date, card.footer, card.maxLabel, card.maxScore, ...card.podium.flatMap((w) => [w.name, w.details ?? '', w.score])]
    for (const text of texts) for (const c of text) expect(c, text).toMatch(CARD_CHAR)
  })

  it('falls back to a neutral title when nothing drawable is left', () => {
    expect(rankingCards(results({}), 'five', { ...meta, tastingName: 'Вечер вина' })[0].title).toBe('Unsere Weinprobe')
  })
})

describe('rankingImageCount', () => {
  it('needs one image up to 10 wines and then grows with the wine count', () => {
    expect([0, 1, 10].map(rankingImageCount)).toEqual([1, 1, 1])
    expect([11, 24, 25, 40].map(rankingImageCount)).toEqual([2, 2, 3, 4])
  })
})

describe('rankingCards split', () => {
  const rated = (count: number) => {
    const wines = Array.from({ length: count }, (_, i) => wine(`w${i}`, i + 1))
    return results({ wines, ratings: wines.map((w, i) => rate(w.id, 5 - i * 0.05)) })
  }

  it('splits rows evenly', () => {
    const sizes = (count: number) => rankingCards(rated(count), 'five', meta).map((c) => c.rest.length)
    expect(sizes(10)).toEqual([7])
    expect(sizes(11)).toEqual([4, 4])
    expect(sizes(13)).toEqual([5, 5])
    expect(sizes(25)).toEqual([7, 8, 7])
  })

  it('labels follow-ups', () => {
    const cards = rankingCards(rated(25), 'five', meta)
    expect(cards.map((c) => c.rangeLabel)).toEqual([null, 'Weine 11–18 von 25', 'Weine 19–25 von 25'])
    expect(cards[1]).toMatchObject({ kind: 'rows', layout: 'compact', podium: [], page: 2, pageCount: 3 })
    expect(cards[0]).toMatchObject({ kind: 'podium', page: 1 })
  })

  it('keeps every wine when few or none are rated', () => {
    const partial = (count: number, ratedCount: number) => {
      const wines = Array.from({ length: count }, (_, i) => wine(`w${i}`, i + 1))
      return results({ wines, ratings: wines.slice(0, ratedCount).map((w) => rate(w.id, 4)) })
    }
    const total = (count: number, ratedCount: number) =>
      rankingCards(partial(count, ratedCount), 'five', meta).reduce((sum, c) => sum + c.podium.length + c.rest.length, 0)
    expect([total(10, 0), total(10, 2), total(10, 1), total(12, 2), total(25, 0)]).toEqual([10, 10, 10, 12, 25])
    expect(rankingCards(partial(10, 0), 'five', meta)).toHaveLength(1)
    expect(rankingCards(partial(10, 2), 'five', meta)).toHaveLength(1)
  })

  it('labels follow-ups by the wines actually shown before them', () => {
    const wines = Array.from({ length: 12 }, (_, i) => wine(`w${i}`, i + 1))
    const cards = rankingCards(results({ wines, ratings: wines.slice(0, 2).map((w) => rate(w.id, 4)) }), 'five', meta)
    expect(cards.map((c) => c.podium.length + c.rest.length)).toEqual([7, 5])
    expect(cards[1].rangeLabel).toBe('Weine 8–12 von 12')
  })

  it('numbers the footer only with several images', () => {
    expect(rankingCards(rated(25), 'five', { ...meta, guestCount: 4 })[1].footer).toBe('Bild 2 von 3 · 5-Punkte-Skala · 4 Gäste')
    expect(rankingCards(rated(10), 'five', { ...meta, guestCount: 4 })[0].footer).toBe('5-Punkte-Skala · 4 Gäste')
  })

  it('matches the image count of the page, shows every wine once and never overfills a follow-up', () => {
    for (let count = 1; count <= 40; count++) {
      const wines = Array.from({ length: count }, (_, i) => wine(`w${i}`, i + 1))
      const ratedCounts = new Set([...Array.from({ length: Math.min(count, 5) + 1 }, (_, i) => i), count])
      for (const ratedCount of ratedCounts) {
        const r = results({ wines, ratings: wines.slice(0, ratedCount).map((w, i) => rate(w.id, 5 - i * 0.1)) })
        const cards = rankingCards(r, 'five', meta)
        const where = `${count} wines, ${ratedCount} rated`
        expect(cards.length, where).toBe(rankingImageCount(count))
        const shown = cards.flatMap((c) => [...c.podium, ...c.rest].map((w) => w.wineId))
        expect(shown.toSorted(), where).toEqual(wines.map((w) => w.id).toSorted())
        for (const card of cards.slice(1)) expect(card.rest.length, where).toBeLessThanOrEqual(CONTINUATION_ROWS)
      }
    }
  })
})

describe('rankingImageUrl', () => {
  it('keeps the plain address for image 1 and numbers the others', () => {
    expect(rankingImageUrl('8GXBW5', 1)).toBe('/tasting/8GXBW5/results/image')
    expect(rankingImageUrl('8GXBW5', 2)).toBe('/tasting/8GXBW5/results/image?bild=2')
    expect(rankingImageUrl('8GXBW5', 12)).toBe('/tasting/8GXBW5/results/image?bild=12')
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

  it('numbers the files only with several images', () => {
    expect(rankingImageFilename('Weinabend bei Paul', 2, 3)).toBe('weinabend-bei-paul-ergebnis-2.png')
    expect(rankingImageFilename('Weinabend bei Paul', 1, 1)).toBe('weinabend-bei-paul-ergebnis.png')
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
