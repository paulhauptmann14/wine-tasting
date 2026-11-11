import { SWEETNESS_LABELS, type Sweetness } from './sweetness'
import { WINE_TYPE_LABELS, type WineType } from './wine-type'

export type WineDetails = {
  vintage: number | null
  grapeVariety: string | null
  sweetness: Sweetness | null
  wineType: WineType | null
}
export type WineLike = { position: number; name: string } & WineDetails

/** "Weißwein · 2022 · Riesling · trocken" – or null if nothing is set. */
export function wineDetails(wine: WineDetails): string | null {
  const wineType = wine.wineType ? WINE_TYPE_LABELS[wine.wineType] : null
  const sweetness = wine.sweetness ? SWEETNESS_LABELS[wine.sweetness] : null
  return [wineType, wine.vintage, wine.grapeVariety, sweetness].filter(Boolean).join(' · ') || null
}

export function wineTitle(wine: WineLike, showName: boolean): { title: string; subtitle: string | null } {
  if (!showName) return { title: `Wein #${wine.position}`, subtitle: null }
  return { title: wine.name, subtitle: wineDetails(wine) }
}
