// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import type { Review } from '@/lib/tasting/review'
import type { Scale } from '@/lib/tasting/presets'
import { ResultsReview } from './results-review'

const full: Review = {
  personal: {
    rows: [
      { position: 1, name: 'Riesling', mine: 5, others: 3 },
      { position: 2, name: 'Silvaner', mine: 2, others: null },
    ],
    favorite: { name: 'Riesling', groupRank: 2 },
    above: { position: 1, name: 'Riesling', mine: 5, others: 3 },
    below: { position: 3, name: 'Merlot', mine: 1, others: 4 },
  },
  controversial: { position: 1, name: 'Riesling', min: 1, max: 5 },
  consensus: { position: 3, name: 'Merlot', min: 4, max: 4 },
}

const show = (review: Review, scale: Scale = 'five') => render(<ResultsReview review={review} scale={scale} />)

it('is closed by default', () => {
  const { container } = show(full)
  expect(container.querySelector('details')).not.toHaveAttribute('open')
  expect(screen.getByText('Dein Rückblick').closest('summary')).not.toBeNull()
})

it('says "alle x" when the rounded min and max are equal', () => {
  show({ personal: null, controversial: null, consensus: { position: 1, name: 'Merlot', min: 3.31, max: 3.34 } })
  expect(screen.getByText('Merlot – alle 3,3')).toBeInTheDocument()
})

it('shows favorite, highlights and rows', () => {
  show(full)
  expect(screen.getByText('Dein Favorit: Riesling – bei allen Platz 2.')).toBeInTheDocument()
  expect(screen.getByText('Riesling mochtest du deutlich mehr als die anderen.')).toBeInTheDocument()
  expect(screen.getByText('Merlot mochtest du deutlich weniger als die anderen.')).toBeInTheDocument()
  const table = screen.getByRole('table')
  expect(within(table).getByRole('columnheader', { name: 'du' })).toBeInTheDocument()
  expect(within(table).getByRole('columnheader', { name: 'die anderen' })).toBeInTheDocument()
  expect(within(table).getByRole('rowheader', { name: '1 Riesling' })).toBeInTheDocument()
  expect(within(table).getByText('nur du')).toBeInTheDocument()
  expect(screen.getByText('Am umstrittensten')).toBeInTheDocument()
  expect(screen.getByText('Riesling – Noten von 1,0 bis 5,0')).toBeInTheDocument()
  expect(screen.getByText('Am einigsten')).toBeInTheDocument()
  expect(screen.getByText('Merlot – alle 4,0')).toBeInTheDocument()
})

it('words the favorite for rank 1 and for no rank', () => {
  const personal = (groupRank: number | null) => ({ ...full, personal: { ...full.personal!, favorite: { name: 'Riesling', groupRank } } })
  const first = show(personal(1))
  expect(screen.getByText('Dein Favorit: Riesling – wie bei allen Platz 1.')).toBeInTheDocument()
  first.unmount()
  show(personal(null))
  expect(screen.getByText('Dein Favorit: Riesling.')).toBeInTheDocument()
})

it('words a consensus range', () => {
  show({ ...full, consensus: { position: 3, name: 'Merlot', min: 3, max: 4 } })
  expect(screen.getByText('Merlot – alle zwischen 3,0 und 4,0')).toBeInTheDocument()
})

it('uses the tasting scale', () => {
  show(full, 'hundred')
  expect(within(screen.getByRole('table')).getByText('100')).toBeInTheDocument()
  expect(screen.getByText('Dein Favorit: Riesling – bei allen Platz 2.')).toBeInTheDocument()
})

it('group-only review is titled "Rückblick"', () => {
  show({ ...full, personal: null })
  expect(screen.getByText('Rückblick')).toBeInTheDocument()
  expect(screen.queryByText('Dein Rückblick')).not.toBeInTheDocument()
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
})
