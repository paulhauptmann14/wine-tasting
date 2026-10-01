export const THEME_COOKIE = 'wt_theme'
export type Theme = 'light' | 'dark'

/** Gespeicherte Wahl; ohne Wahl folgt die App der Systemeinstellung. */
export function parseTheme(value: string | undefined): Theme | undefined {
  return value === 'light' || value === 'dark' ? value : undefined
}
