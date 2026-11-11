// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { PRESETS } from '@/lib/tasting/presets'
import { ScoringExplainer } from './scoring-explainer'

it('explains the Parker floor and the lowest possible score on the 100-point scale', () => {
  render(<ScoringExplainer scale="hundred" criteria={PRESETS.hundred.criteria} />)
  expect(screen.getByText(/Robert Parker/)).toHaveTextContent('niedrigste mögliche Note ist deshalb 60')
  expect(screen.getByText('Sockel für jeden Wein')).toBeInTheDocument()
})

it('does not mention a floor on scales that start at zero', () => {
  render(<ScoringExplainer scale="twenty" criteria={PRESETS.twenty.criteria} />)
  expect(screen.queryByText(/Robert Parker/)).not.toBeInTheDocument()
  expect(screen.queryByText('Sockel für jeden Wein')).not.toBeInTheDocument()
})

it('uses the singular for one point', () => {
  render(<ScoringExplainer scale="twenty" criteria={[{ name: 'Preis-Leistung', weight: 1 }, { name: 'Farbe', weight: 19 }]} />)
  expect(screen.getByText('1 Punkt')).toBeInTheDocument()
  expect(screen.queryByText(/1 Punkte/)).toBeNull()
})
