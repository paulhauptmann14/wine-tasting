import { expect, it } from 'vitest'
import type { RankingCard, RankingCardWine } from '@/lib/tasting/ranking-card'
import { rowHeight } from './ranking-image'

const wines = (count: number) =>
  Array.from({ length: count }, (_, i): RankingCardWine => ({ wineId: `w${i}`, position: i + 1, rank: i + 1, name: `Wein ${i}`, details: null, score: '4,0' }))

const card = (podium: number, rest: number, kind: RankingCard['kind'] = 'podium') =>
  ({ kind, layout: 'compact', podium: wines(podium), rest: wines(rest) }) as RankingCard

it('uses the layout row height while the podium leaves room', () => {
  expect(rowHeight(card(3, 7))).toBe(64)
  expect(rowHeight(card(1, 9))).toBe(64)
  expect(rowHeight(card(0, 10))).toBe(64)
  expect(rowHeight(card(0, 14, 'rows'))).toBe(64)
  expect(rowHeight({ ...card(3, 2), layout: 'roomy' })).toBe(80)
})

it('packs eight rows below a podium with runners-up into the height of seven', () => {
  // Two rated wines: winner + runner-up, then eight rows – else a two-line title runs into the date
  expect(rowHeight(card(2, 8))).toBe(56)
  expect(8 * rowHeight(card(2, 8))).toBe(7 * rowHeight(card(3, 7)))
})
