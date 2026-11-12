// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Results, WineResult } from '@/lib/tasting/results'
import { ResultsView } from './results-view'

const wine = (position: number, score: number | null, rank: number | null): WineResult => ({
  wineId: `w${position}`,
  position,
  label: `Wein #${position}`,
  name: `Wein ${position}`,
  score,
  rank,
  ratingCount: score === null ? 0 : 2,
  criterionAverages: { c1: score },
  wineType: null,
  winery: null,
  vintage: null,
  grapeVariety: null,
  sweetness: null,
  description: null,
})

const results = (wines: WineResult[]): Results => ({ criteria: [{ id: 'c1', name: 'Geschmack', weight: 1 }], wines })

const view = (wines: WineResult[], notes?: Record<string, string[]>) =>
  render(<ResultsView results={results(wines)} status="finished" scale="five" notes={notes} />)

it('marks a shared place as "gleichauf" and leaves clear places alone', () => {
  view([wine(1, 4.5, 1), wine(2, 4, 2), wine(3, 4, 2)])
  const podium = screen.getByRole('list', { name: 'Podest' })
  expect(within(podium).getByText('Platz 1')).toBeInTheDocument()
  expect(within(podium).getAllByText('Platz 2 · gleichauf')).toHaveLength(2)
})

it('writes the place in the list rows as "4." with "gleichauf" only for ties', () => {
  view([wine(1, 5, 1), wine(2, 4.5, 2), wine(3, 4, 3), wine(4, 3, 4), wine(5, 3, 4), wine(6, null, null)])
  const rows = within(screen.getByRole('list', { name: 'Weitere Plätze' })).getAllByRole('listitem')
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('Platz 4.gleichauf')
  expect(rows[1]).toHaveTextContent('Platz 4.gleichauf')
  expect(rows[2]).toHaveTextContent('–')
  expect(within(rows[2]).queryByText('gleichauf')).not.toBeInTheDocument()
})

it('captions the criteria table with what its columns are', () => {
  view([wine(1, 4, 1), wine(2, 3, 2)])
  expect(screen.getByRole('table', { name: 'Sterne je Kriterium (Ø), Spalten = Weinnummer' })).toBeInTheDocument()
})

it('says that notes are shown without names', () => {
  view([wine(1, 4, 1)], { w1: ['Pfirsich'] })
  const notes = screen.getByRole('region', { name: 'Notizen' })
  expect(within(notes).getByText('Ohne Namen, wie geschrieben.')).toBeInTheDocument()
})

it('shows the description under the details of a revealed wine, and nothing for a blind one', () => {
  view([{ ...wine(1, 4.5, 1), sweetness: 'sweet', description: 'Süß & fruchtig' }, { ...wine(2, 4, 2), name: null, description: null }])
  const podium = screen.getByRole('list', { name: 'Podest' })
  expect(within(podium).getByText('süß')).toBeInTheDocument()
  expect(within(podium).getByText('Süß & fruchtig')).toBeInTheDocument()
  expect(within(podium).getAllByText(/fruchtig/)).toHaveLength(1)
})
