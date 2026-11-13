// @vitest-environment jsdom
import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ParticipantRingShapes, ParticipantRowRest } from './participant-progress'

it('names every ring and points it at a shape drawn once per page', () => {
  const { container } = render(
    <>
      <ParticipantRingShapes count={3} />
      <ParticipantRowRest name="Anna" wines={['done', 'open', 'incomplete']} removeAction={async () => {}} />
      <ParticipantRowRest name="Ben" wines={['done', 'done', 'open']} removeAction={async () => {}} />
    </>,
  )
  const anna = screen.getByRole('list', { name: 'Fortschritt von Anna' })
  const rings = within(anna).getAllByRole('img')
  expect(rings.map((r) => r.getAttribute('aria-label'))).toEqual([
    'Wein #1: bewertet',
    'Wein #2: offen',
    'Wein #3: ergänzen',
  ])
  // Each ring is one <use> of a symbol – no ring drawing repeated per guest
  for (const ring of container.querySelectorAll('[role="img"]')) {
    const href = ring.querySelector('use')!.getAttribute('href')!
    expect(container.querySelector(`symbol${href}`)).not.toBeNull()
    expect(ring.querySelector('path')).toBeNull()
  }
  expect(screen.getByRole('button', { name: 'Ben entfernen' })).toBeTruthy()
})
