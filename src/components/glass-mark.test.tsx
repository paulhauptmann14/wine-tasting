// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { expect, it } from 'vitest'
import { glassMarkParts, glassMarkSvg } from '@/lib/glass-mark'
import { GlassMark } from './glass-mark'

it('draws the same paths as the icon markup, hidden from screen readers', () => {
  const { container } = render(<GlassMark className="size-7" />)
  const svg = container.querySelector('svg')!
  expect(svg.getAttribute('aria-hidden')).toBe('true')
  expect(svg.getAttribute('viewBox')).toBe('0 0 100 100')
  expect(svg.getAttribute('stroke')).toBe('currentColor')
  expect(svg.getAttribute('class')).toBe('size-7')
  const paths = Array.from(svg.querySelectorAll('path'))
  expect(paths).toHaveLength(glassMarkParts().length)
  // Same element markup as the standalone SVG (favicon, PNG icons)
  const standalone = new DOMParser().parseFromString(glassMarkSvg(), 'image/svg+xml')
  const attributes = (path: Element) => Object.fromEntries(Array.from(path.attributes, (a) => [a.name, a.value]))
  expect(paths.map(attributes)).toEqual(Array.from(standalone.querySelectorAll('path'), attributes))
})
