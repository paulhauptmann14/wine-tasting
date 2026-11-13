// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { TastingSplit } from './tasting-split'

it('renders the aside once, between top and content, when there is a top', () => {
  const { container } = render(
    <TastingSplit aside={<p>Liste</p>} top={<p>Kopf</p>}>
      <p>Knöpfe</p>
    </TastingSplit>,
  )
  expect(screen.getAllByText('Liste')).toHaveLength(1)
  expect(screen.getByRole('complementary', { name: 'Weine' })).toBeTruthy()
  expect(container.textContent).toBe('KopfListeKnöpfe')
})

it('keeps the aside for large screens only without a top', () => {
  render(
    <TastingSplit aside={<p>Liste</p>}>
      <p>Inhalt</p>
    </TastingSplit>,
  )
  expect(screen.getByRole('complementary', { name: 'Weine' }).className).toContain('hidden lg:block')
})
