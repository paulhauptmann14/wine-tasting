import { ovalRing } from './ring-path'

/**
 * The logo: a stemmed glass with pale wine, standing in its own glass-ring stain.
 * One geometry for the header (<GlassMark>), the favicon, the home screen icons and the share image.
 */

export type GlassMarkPart =
  | { kind: 'fill'; d: string; opacity: number }
  | { kind: 'stroke'; d: string; width: number; dasharray?: string; dashoffset?: string }

type Geometry = {
  /** Stroke of bowl, stem and foot */
  glass: number
  rim: number
  /** The darker spot where the glass was set down */
  lip: number
  ring: { rx: number; ry: number; cy: number }
  foot: boolean
}

const RING_SEED = 8
const RING_CX = 50

const REGULAR: Geometry = { glass: 5.5, rim: 5.5, lip: 9, ring: { rx: 42, ry: 14, cy: 81 }, foot: true }
// Favicon (≤ 32 px): thicker lines, a flatter ring and no foot – at 16 px foot and ring blur into one
const BOLD: Geometry = { glass: 8.5, rim: 7.5, lip: 11, ring: { rx: 41, ry: 12, cy: 82 }, foot: false }

// Tulip bowl, slightly uneven like a hand-drawn line (open top), and the wine inside it
const BOWL = 'M27.5 9C23 27 23.5 48 49.5 55.5C77 48 77.5 26 72 8.5'
const WINE = 'M25.6 31.5C33 30.5 66 30 75 32C74.5 45 68 51 49.5 55.5C31 51 25 44 25.6 31.5Z'
const STEM_TOP = 'M49.5 56'
const FOOT = 'M39.5 81.5C45 79.8 55 79.6 61 81.2'

const fixed = (n: number) => n.toFixed(1)

export function glassMarkParts({ bold = false }: { bold?: boolean } = {}): GlassMarkPart[] {
  const g = bold ? BOLD : REGULAR
  const { rx, ry, cy } = g.ring
  const rim = ovalRing(RING_SEED, { rx, ry, cx: RING_CX, cy })
  // Absolute dash lengths – resvg ignores pathLength. The outline starts on the right and runs
  // clockwise: the gap sits at the back behind the stem, the lip pools on the front left.
  const dash = (...parts: number[]) => parts.map((p) => fixed(p * rim.length)).join(' ')
  const stem = `${STEM_TOP}L50.2 ${g.foot ? 79.5 : cy - 0.5}`
  return [
    { kind: 'fill', d: ovalRing(RING_SEED - 3, { rx: rx - 2, ry: ry - 1.5, cx: RING_CX, cy }).d, opacity: 0.12 },
    { kind: 'stroke', d: rim.d, width: g.rim, dasharray: dash(0.84, 0.16), dashoffset: dash(0.15) },
    { kind: 'stroke', d: rim.d, width: g.lip, dasharray: dash(0.2, 0.8), dashoffset: dash(-0.27) },
    { kind: 'fill', d: WINE, opacity: 0.22 },
    { kind: 'stroke', d: [BOWL, stem, g.foot ? FOOT : ''].join(' ').trim(), width: g.glass },
  ]
}

/**
 * The mark on a solid tile: scaled around a point a bit below its middle (bowl top to ring bottom
 * centers at y 52), so it sits slightly high – optically centered – and stays well inside the circle
 * of 80 % that maskable icons may be cropped to (the heavy lip would otherwise graze its edge).
 */
export const GLASS_MARK_TILE = { scale: 0.64, x: 50, y: 54 } as const

/** SVG attributes of one part, in the same form for the markup string and the React component. */
export function glassMarkPartAttributes(part: GlassMarkPart): Record<string, string | number> {
  return part.kind === 'fill'
    ? { d: part.d, fill: 'currentColor', fillOpacity: part.opacity, stroke: 'none' }
    : {
        d: part.d,
        strokeWidth: part.width,
        ...(part.dasharray && { strokeDasharray: part.dasharray }),
        ...(part.dashoffset && { strokeDashoffset: part.dashoffset }),
      }
}

/** Root attributes shared by all paths: outlines in the text color, round ends. */
export const GLASS_MARK_ROOT = {
  viewBox: '0 0 100 100',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

const kebab = (name: string) => name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)
const attrs = (record: Record<string, string | number>) =>
  Object.entries(record)
    .map(([k, v]) => ` ${kebab(k)}="${v}"`)
    .join('')

export type GlassMarkSvgOptions = {
  /** Paint of the mark; without it the mark follows `currentColor` of the embedding page. */
  color?: string
  /** Paint in dark mode – for the transparent favicon, which can't read the page's theme. */
  darkColor?: string
  /** Solid tile behind a smaller mark (home screen icons, maskable safe zone). */
  background?: string
  /** Thicker strokes for ≤ 32 px. */
  bold?: boolean
}

/** The mark as standalone SVG markup (favicon, PNG icons, share image). */
export function glassMarkSvg({ color, darkColor, background, bold = false }: GlassMarkSvgOptions = {}): string {
  const { viewBox, ...root } = GLASS_MARK_ROOT
  const paths = glassMarkParts({ bold })
    .map((part) => `<path${attrs(glassMarkPartAttributes(part))}/>`)
    .join('')
  const { scale, x, y } = GLASS_MARK_TILE
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}"${color ? ` color="${color}"` : ''}${attrs(root)}>`,
    darkColor ? `<style>@media (prefers-color-scheme: dark){svg{color:${darkColor}}}</style>` : '',
    background ? `<rect width="100" height="100" fill="${background}" stroke="none"/>` : '',
    background
      ? `<g transform="translate(50 50) scale(${scale}) translate(${-x} ${-y})">${paths}</g>`
      : paths,
    '</svg>',
  ].join('')
}
