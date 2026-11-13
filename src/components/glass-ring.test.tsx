// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ringPath } from '@/lib/ring-path'
import { GlassRing, GlassRingDefs, GlassRingUse, ringShapeId } from './glass-ring'

const ds = (root: ParentNode) => Array.from(root.querySelectorAll('path'), (p) => p.getAttribute('d'))

it('draws the rim outline once and reuses it for the pooled part', () => {
  const { container } = render(<GlassRing seed={4} />)
  expect(ds(container)).toEqual([ringPath(4, 38), ringPath(11, 37), ringPath(7, 40.5)])
  const rim = container.querySelectorAll('path')[2]
  const use = container.querySelector('use')!
  expect(rim.id).not.toBe('')
  expect(use.getAttribute('href')).toBe(`#${rim.id}`)
  // The second stroke keeps its own look
  expect(use.getAttribute('class')).toContain('[stroke-width:7.5]')
})

it('gives every ring on a page its own rim id', () => {
  const { container } = render(
    <>
      <GlassRing seed={1} />
      <GlassRing seed={1} />
    </>,
  )
  const [a, b] = Array.from(container.querySelectorAll('use'), (u) => u.getAttribute('href'))
  expect(a).not.toBe(b)
})

it('draws open and incomplete rings as one dotted outline', () => {
  const { container } = render(<GlassRing seed={2} state="open" />)
  expect(ds(container)).toEqual([ringPath(2, 40)])
  expect(container.querySelector('use')).toBeNull()
})

it('is an image with a label, else hidden from screen readers', () => {
  const { container } = render(
    <>
      <GlassRing seed={1} label="Wein #1: bewertet" />
      <GlassRing seed={2} />
    </>,
  )
  expect(screen.getByRole('img', { name: 'Wein #1: bewertet' })).toBeTruthy()
  expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(1)
})

it('shares one drawing per shape between many small rings', () => {
  const { container } = render(
    <>
      <GlassRingDefs idPrefix="t" count={2} />
      <GlassRingUse idPrefix="t" seed={2} state="done" size={28} label="Wein #2: bewertet">
        2
      </GlassRingUse>
    </>,
  )
  // Every seed in every state, drawn exactly like <GlassRing>
  const symbols = container.querySelectorAll('symbol')
  expect(symbols).toHaveLength(6)
  const done = container.querySelector(`symbol#${ringShapeId('t', 2, 'done')}`)!
  expect(ds(done)).toEqual([ringPath(2, 38), ringPath(9, 37), ringPath(5, 40.5), ringPath(5, 40.5)])
  expect(ds(container.querySelector(`symbol#${ringShapeId('t', 1, 'open')}`)!)).toEqual([ringPath(1, 40)])

  const ring = screen.getByRole('img', { name: 'Wein #2: bewertet' })
  expect(ring.style.width).toBe('28px')
  expect(ring.querySelector('use')!.getAttribute('href')).toBe(`#${done.id}`)
  expect(ring.textContent).toBe('2')
})

it('keeps the frame of the full ring', () => {
  const { container } = render(
    <>
      <GlassRing seed={3} state="open" size={28} label="a" />
      <GlassRingUse idPrefix="t" seed={3} state="open" size={28} label="a" />
    </>,
  )
  const [full, shared] = Array.from(container.querySelectorAll('[role="img"]'))
  expect(shared.getAttribute('class')).toBe(full.getAttribute('class'))
  expect(shared.getAttribute('style')).toBe(full.getAttribute('style'))
  expect(shared.querySelector('svg')!.getAttribute('class')).toBe(full.querySelector('svg')!.getAttribute('class'))
})
