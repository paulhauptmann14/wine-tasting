export const THEME_COOKIE = 'wt_theme'
export type Theme = 'light' | 'dark'

/** Saved choice; without one the app follows the system setting. */
export function parseTheme(value: string | undefined): Theme | undefined {
  return value === 'light' || value === 'dark' ? value : undefined
}
