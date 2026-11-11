import { glassMarkSvg } from './glass-mark'

/** Concrete values of the theme tokens in globals.css – icons can't use CSS variables. */
export const APP_ICON_COLORS = {
  wine: '#8e1538',
  wineDark: '#ff4f7b',
  background: '#f2f2f7',
} as const

/**
 * The glass mark as app icon. Without a background it is the favicon: transparent, drawn bold so it
 * still reads at 16 px, rosé in dark mode (browser tab). With a background it becomes a solid tile
 * with room for the maskable crop (home screen icons).
 */
export function appIconSvg({ background }: { background?: string } = {}): string {
  return background
    ? glassMarkSvg({ color: APP_ICON_COLORS.wine, background })
    : glassMarkSvg({ color: APP_ICON_COLORS.wine, darkColor: APP_ICON_COLORS.wineDark, bold: true })
}

/** SVG markup as data URI for <img> inside ImageResponse. */
export const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`

/** As data URI for <img> inside ImageResponse. */
export const appIconDataUri = (background?: string) => svgDataUri(appIconSvg({ background }))
