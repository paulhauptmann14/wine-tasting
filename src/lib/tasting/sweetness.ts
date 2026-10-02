/** Offizielle deutsche Geschmacksangaben für Wein, von trocken nach süß. */
export const SWEETNESS_KEYS = ['dry', 'off_dry', 'medium', 'sweet'] as const
export type Sweetness = (typeof SWEETNESS_KEYS)[number]

export const SWEETNESS_LABELS: Record<Sweetness, string> = {
  dry: 'trocken',
  off_dry: 'halbtrocken',
  medium: 'lieblich',
  sweet: 'süß',
}
