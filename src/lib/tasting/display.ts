import { SWEETNESS_LABELS, type Sweetness } from './sweetness'

type WineLike = {
  position: number
  name: string
  vintage: number | null
  grapeVariety: string | null
  sweetness: Sweetness | null
}

/** „2022 · Riesling · trocken“ – oder null, wenn nichts angegeben ist. */
export function wineDetails(wine: Pick<WineLike, 'vintage' | 'grapeVariety' | 'sweetness'>): string | null {
  const sweetness = wine.sweetness ? SWEETNESS_LABELS[wine.sweetness] : null
  return [wine.vintage, wine.grapeVariety, sweetness].filter(Boolean).join(' · ') || null
}

export function wineTitle(wine: WineLike, showName: boolean): { title: string; subtitle: string | null } {
  if (!showName) return { title: `Wein #${wine.position}`, subtitle: null }
  return { title: wine.name, subtitle: wineDetails(wine) }
}
