// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ResultImageLinks } from './result-image-links'

const IMAGE_URL = '/tasting/8GXBW5/results/image'

it('links each image after a short lead-in', () => {
  render(<ResultImageLinks code="8GXBW5" imageCount={3} />)
  expect(screen.getByText('Einzeln öffnen:')).toBeInTheDocument()
  const links = screen.getAllByRole('link')
  expect(links.map((link) => [link.textContent, link.getAttribute('href')])).toEqual([
    ['Bild 1', IMAGE_URL],
    ['Bild 2', `${IMAGE_URL}?bild=2`],
    ['Bild 3', `${IMAGE_URL}?bild=3`],
  ])
  for (const link of links) {
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveClass('h-12')
  }
})

it('renders nothing for a single image – its link stays in the bar', () => {
  const { container } = render(<ResultImageLinks code="8GXBW5" imageCount={1} />)
  expect(container).toBeEmptyDOMElement()
})
