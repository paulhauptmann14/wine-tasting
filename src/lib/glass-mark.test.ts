import { expect, it } from 'vitest'
import { GLASS_MARK_TILE, glassMarkParts, glassMarkSvg } from './glass-mark'

const numbers = (d: string) => [...d.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]))

/** Points a path actually passes through: M/L points and curve end points, not Bezier control points. */
const anchors = (d: string) =>
  [...d.matchAll(/([MLC])([^MLCZ]*)/g)].map(([, command, args]) => {
    const values = numbers(args)
    const end = command === 'C' ? values.slice(4, 6) : values.slice(0, 2)
    return { x: end[0], y: end[1] }
  })

const glassStroke = (parts: ReturnType<typeof glassMarkParts>) => {
  const last = parts.at(-1)!
  if (last.kind !== 'stroke') throw new Error('The glass is drawn last, as a stroke')
  return last
}

it('draws the mark in a square viewBox, in the text color by default', () => {
  const svg = glassMarkSvg()
  expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"/)
  expect(svg).toContain('stroke="currentColor"')
  expect(svg).toContain('fill="currentColor"')
  expect(svg).not.toContain('<style>')
  expect(svg).not.toContain('<rect')
})

it('takes a fixed color and a dark-mode color for the favicon', () => {
  const svg = glassMarkSvg({ color: '#111111', darkColor: '#eeeeee' })
  expect(svg).toContain('color="#111111"')
  expect(svg).toMatch(/@media \(prefers-color-scheme: dark\)\{svg\{color:#eeeeee\}\}/)
})

it('puts a smaller mark on a solid tile', () => {
  const svg = glassMarkSvg({ color: '#111111', background: '#f0f0f0' })
  expect(svg).toContain('<rect width="100" height="100" fill="#f0f0f0" stroke="none"/>')
  expect(svg).toContain(`translate(50 50) scale(${GLASS_MARK_TILE.scale})`)
})

it('keeps the tile mark inside the safe zone of maskable icons, with some room to spare', () => {
  // Maskable icons may be cropped to a circle of 40 % of the size around the center – stay at 36 %,
  // launchers differ in their masks and a lip right at the edge looks cramped
  for (const part of glassMarkParts()) {
    const values = numbers(part.d)
    const half = part.kind === 'stroke' ? part.width / 2 : 0
    for (let i = 0; i < values.length; i += 2) {
      // Bezier control points lie outside their curve, so this errs on the safe side
      const { scale, x, y } = GLASS_MARK_TILE
      const distance = Math.hypot(values[i] - x, values[i + 1] - y) + half
      expect(distance * scale).toBeLessThanOrEqual(36)
    }
  }
})

it('stays inside its viewBox, also with the bold strokes', () => {
  for (const bold of [false, true]) {
    for (const part of glassMarkParts({ bold })) {
      const half = part.kind === 'stroke' ? part.width / 2 : 0
      for (const { x, y } of anchors(part.d)) {
        for (const v of [x, y]) {
          expect(v - half).toBeGreaterThanOrEqual(0)
          expect(v + half).toBeLessThanOrEqual(100)
        }
      }
    }
  }
})

it('draws thicker, simpler lines for small favicons', () => {
  const regular = glassMarkParts()
  const bold = glassMarkParts({ bold: true })
  const widths = (parts: typeof regular) => parts.flatMap((p) => (p.kind === 'stroke' ? [p.width] : []))
  widths(bold).forEach((w, i) => expect(w).toBeGreaterThan(widths(regular)[i]))
  // Regular: bowl, stem and foot. Bold: no foot – at 16 px it blurs into the ring
  const subpaths = (d: string) => d.match(/M/g)!.length
  expect(subpaths(glassStroke(regular).d)).toBe(3)
  expect(subpaths(glassStroke(bold).d)).toBe(2)
  // … the stem reaches down into the ring instead
  const ringCenterY = (parts: typeof regular) => {
    const ys = anchors(parts.find((p) => p.kind === 'stroke')!.d).map((p) => p.y)
    return (Math.min(...ys) + Math.max(...ys)) / 2
  }
  const stemEnd = anchors(glassStroke(bold).d).at(-1)!
  expect(Math.abs(stemEnd.y - ringCenterY(bold))).toBeLessThan(1)
})

it('uses absolute dash lengths – the PNG renderer ignores pathLength', () => {
  expect(glassMarkSvg()).not.toContain('pathLength')
  expect(glassMarkSvg()).toContain('stroke-dasharray="')
})
