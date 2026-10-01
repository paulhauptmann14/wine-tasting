type WineLike = { position: number; name: string; vintage: number | null; grapeVariety: string | null }

export function wineTitle(wine: WineLike, showName: boolean): { title: string; subtitle: string | null } {
  if (!showName) return { title: `Wein #${wine.position}`, subtitle: null }
  const subtitle = [wine.vintage, wine.grapeVariety].filter(Boolean).join(' · ')
  return { title: wine.name, subtitle: subtitle || null }
}
