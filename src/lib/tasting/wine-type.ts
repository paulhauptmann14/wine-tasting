/** Wine types for the wine details, in display order. */
export const WINE_TYPE_KEYS = ['red', 'white', 'rose', 'sparkling'] as const
export type WineType = (typeof WINE_TYPE_KEYS)[number]

export const WINE_TYPE_LABELS: Record<WineType, string> = {
  red: 'Rotwein',
  white: 'Weißwein',
  rose: 'Rosé',
  sparkling: 'Schaumwein',
}
