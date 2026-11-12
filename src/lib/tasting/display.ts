import { SWEETNESS_LABELS, type Sweetness } from './sweetness'
import { WINE_TYPE_LABELS, type WineType } from './wine-type'

export type WineDetails = {
  winery: string | null
  vintage: number | null
  grapeVariety: string | null
  sweetness: Sweetness | null
  wineType: WineType | null
  /** Free-text taste description ("Süß & fruchtig"), shown on its own line and never on the share image */
  description: string | null
}
export type WineLike = { position: number; name: string } & WineDetails

/** "Weingut Dr. Loosen · Weißwein · 2022 · Riesling · trocken" – or null if nothing is set. Without the description. */
export function wineDetails(wine: WineDetails): string | null {
  const wineType = wine.wineType ? WINE_TYPE_LABELS[wine.wineType] : null
  const sweetness = wine.sweetness ? SWEETNESS_LABELS[wine.sweetness] : null
  return [wine.winery, wineType, wine.vintage, wine.grapeVariety, sweetness].filter(Boolean).join(' · ') || null
}

/** Title, details line and description as a guest may see them: blind wines are only their number. */
export function wineTitle(
  wine: WineLike,
  showName: boolean,
): { title: string; subtitle: string | null; description: string | null } {
  if (!showName) return { title: `Wein #${wine.position}`, subtitle: null, description: null }
  return { title: wine.name, subtitle: wineDetails(wine), description: wine.description || null }
}
