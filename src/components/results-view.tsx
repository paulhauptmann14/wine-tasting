import { GlassRing } from '@/components/glass-ring'
import type { TastingStatus } from '@/lib/tasting/rules'
import { formatScore, type Results, type WineResult } from '@/lib/tasting/results'
import { cn } from '@/lib/utils'

const PODIUM_SIZES = [132, 108, 96]
// Laptop: 2 – 1 – 3 nebeneinander
const PODIUM_ORDER = ['lg:order-2', 'lg:order-1', 'lg:order-3']

function WineIdentity({
  wine,
  revealed,
  delayMs,
  center,
}: {
  wine: WineResult
  revealed: boolean
  delayMs: number
  center?: boolean
}) {
  const subtitle = [wine.vintage, wine.grapeVariety].filter(Boolean).join(' · ')
  return (
    <div className={cn('min-w-0', center && 'lg:text-center')}>
      <p className="text-xs font-medium tracking-wider text-muted-foreground uppercase">{wine.label}</p>
      {wine.name && (
        <p
          key={revealed ? 'revealed' : 'open'}
          className={cn('font-display text-2xl leading-tight', revealed && 'reveal-up')}
          style={{ animationDelay: `${delayMs}ms` }}
        >
          {wine.name}
        </p>
      )}
      {wine.name && subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      <p className="mt-1 text-xs text-muted-foreground">
        {wine.ratingCount} {wine.ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}
      </p>
    </div>
  )
}

export function ResultsView({ results, status }: { results: Results; status: TastingStatus }) {
  const revealed = status === 'finished'
  const ranked = results.wines.filter((w) => w.rank !== null)

  if (ranked.length === 0) {
    return (
      <p className="mt-10 text-muted-foreground">
        Noch keine Bewertungen. Sobald die ersten Sterne vergeben sind, erscheint hier das Ranking.
      </p>
    )
  }

  const podium = ranked.slice(0, 3)
  const rest = results.wines.slice(podium.length)
  const byPosition = [...results.wines].sort((a, b) => a.position - b.position)

  return (
    <div className="mt-10 grid grid-cols-1 gap-14">
      <ol aria-label="Podest" className="grid grid-cols-1 gap-6 lg:flex lg:items-end lg:justify-center lg:gap-12">
        {podium.map((wine, i) => (
          <li key={wine.wineId} className={cn('flex items-center gap-5 lg:flex-col lg:gap-4', PODIUM_ORDER[i])}>
            <GlassRing
              seed={wine.position}
              size={PODIUM_SIZES[i]}
              animation={revealed ? 'soak' : undefined}
              delayMs={(2 - i) * 250}
            >
              <span className="flex flex-col items-center">
                <span className={cn('font-display tabular-nums', i === 0 ? 'text-4xl' : 'text-3xl')}>
                  {formatScore(wine.score)}
                </span>
                <span className="text-[11px] text-muted-foreground">/ 5</span>
              </span>
            </GlassRing>
            <div className="min-w-0 lg:text-center">
              <p className="text-sm font-medium text-wine">Platz {wine.rank}</p>
              <WineIdentity wine={wine} revealed={revealed} delayMs={(2 - i) * 250 + 400} center />
            </div>
          </li>
        ))}
      </ol>

      {rest.length > 0 && (
        <ol aria-label="Weitere Plätze" className="grid grid-cols-1 gap-1">
          {rest.map((wine, i) => (
            <li key={wine.wineId} className="flex items-center gap-4 rounded-2xl px-3 py-2">
              <span className="w-8 text-right text-sm text-muted-foreground tabular-nums">{wine.rank ?? '–'}</span>
              <GlassRing seed={wine.position} state={wine.score === null ? 'open' : 'done'} size={44}>
                <span className="font-display text-sm">{wine.position}</span>
              </GlassRing>
              <div className="min-w-0 flex-1">
                <WineIdentity wine={wine} revealed={revealed} delayMs={900 + i * 80} />
              </div>
              <span className="font-display text-xl tabular-nums">{formatScore(wine.score)}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <caption className="mb-3 text-left text-sm font-medium text-muted-foreground">
            Durchschnitt je Kriterium
          </caption>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 bg-background py-2 pr-6 text-left font-normal text-muted-foreground">
                Kriterium
              </th>
              {byPosition.map((w) => (
                <th key={w.wineId} scope="col" className="px-3 py-2 text-right font-medium tabular-nums">
                  #{w.position}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {results.criteria.map((c) => (
              <tr key={c.id}>
                <th
                  scope="row"
                  className="sticky left-0 border-t border-border bg-background py-2 pr-6 text-left font-normal"
                >
                  {c.name}
                </th>
                {byPosition.map((w) => (
                  <td key={w.wineId} className="border-t border-border px-3 py-2 text-right">
                    {formatScore(w.criterionAverages[c.id] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
            <tr>
              <th
                scope="row"
                className="sticky left-0 border-t border-border bg-background py-2 pr-6 text-left font-semibold"
              >
                Note
              </th>
              {byPosition.map((w) => (
                <td
                  key={w.wineId}
                  className="border-t border-border px-3 py-2 text-right font-semibold text-wine"
                >
                  {formatScore(w.score)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}
