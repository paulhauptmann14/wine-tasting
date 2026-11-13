// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { WineListItem } from '@/server/participant-view'
import { WineList, WineRingStrip } from './wine-list'

const named: WineListItem = {
  position: 3,
  title: 'Riesling Kabinett',
  subtitle: 'Weingut Dr. Loosen · Weißwein',
  description: null,
  state: 'done',
  href: '/tasting/ABC123/wine/3',
}
const blind: WineListItem = { ...named, title: 'Wein #3', subtitle: null }

it('reads the wine number before the name in the list', () => {
  render(<WineList items={[named]} />)
  expect(screen.getByRole('link')).toHaveAccessibleName(/^Wein #3:\s?Riesling Kabinett/)
})

it('does not repeat the number when the title already is the number', () => {
  render(<WineList items={[blind]} />)
  const link = screen.getByRole('link')
  expect(link).toHaveAccessibleName(/^Wein #3/)
  expect(link.textContent?.match(/Wein #3/g)).toHaveLength(1)
})

it('names number and wine in the ring strip', () => {
  const { rerender } = render(<WineRingStrip items={[named]} />)
  expect(screen.getByRole('link')).toHaveAccessibleName('Wein #3: Riesling Kabinett, bewertet')
  rerender(<WineRingStrip items={[blind]} />)
  expect(screen.getByRole('link')).toHaveAccessibleName('Wein #3, bewertet')
})
