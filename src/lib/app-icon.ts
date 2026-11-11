import { ringPath } from './ring-path'

/** Concrete values of the theme tokens in globals.css – icons can't use CSS variables. */
export const APP_ICON_COLORS = {
  wine: '#8e1538',
  wineDark: '#ff4f7b',
  background: '#f2f2f7',
} as const

const SEED = 5
const RIM_RADIUS = 38

/**
 * The glass ring as app icon: drawn bolder than in the app so it still reads at 16 px.
 * Without a background it is transparent and turns rosé in dark mode (browser tab);
 * with a background it becomes a solid tile (home screen icons).
 */
export function appIconSvg({ background }: { background?: string } = {}): string {
  const rim = ringPath(SEED + 3, RIM_RADIUS)
  // Absolute dash lengths instead of pathLength – the PNG renderer (resvg) ignores pathLength
  const c = 2 * Math.PI * RIM_RADIUS
  const dash = (...parts: number[]) => parts.map((p) => (p * c).toFixed(1)).join(' ')
  const style = background
    ? ''
    : `<style>@media (prefers-color-scheme: dark){.w{stroke:${APP_ICON_COLORS.wineDark};fill:${APP_ICON_COLORS.wineDark}}}</style>`
  const tile = background ? `<rect width="100" height="100" fill="${background}"/>` : ''
  // Tiles leave room around the ring so maskable icons can be cropped to a circle
  const scale = background ? 'translate(50 50) scale(0.78) translate(-50 -50)' : ''
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">',
    style,
    tile,
    `<g transform="${scale} rotate(${(SEED * 47) % 360} 50 50)" stroke="${APP_ICON_COLORS.wine}" fill="${APP_ICON_COLORS.wine}" class="w">`,
    `<path d="${ringPath(SEED, RIM_RADIUS - 2)}" stroke="none" fill-opacity="0.12"/>`,
    `<path d="${rim}" fill="none" stroke-width="10" stroke-linecap="round" stroke-dasharray="${dash(0.84, 1)}"/>`,
    `<path d="${rim}" fill="none" stroke-width="13" stroke-linecap="round" stroke-dasharray="${dash(0.2, 1)}" stroke-dashoffset="${dash(-0.45)}"/>`,
    '</g>',
    '</svg>',
  ].join('')
}

/** As data URI for <img> inside ImageResponse. */
export const appIconDataUri = (background?: string) =>
  `data:image/svg+xml;base64,${Buffer.from(appIconSvg({ background })).toString('base64')}`
