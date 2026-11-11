export const THEME_COOKIE = 'wt_theme'
export type Theme = 'light' | 'dark'

/** Page background per theme (= --background in globals.css) – browsers tint their bars with it. */
export const THEME_COLORS: Record<Theme, string> = { light: '#f2f2f7', dark: '#000000' }

/** Saved choice; without one the app follows the system setting. */
export function parseTheme(value: string | undefined): Theme | undefined {
  return value === 'light' || value === 'dark' ? value : undefined
}
