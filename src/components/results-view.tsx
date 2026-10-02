import { GlassRing } from '@/components/glass-ring'
import { wineDetails } from '@/lib/tasting/display'
import type { TastingStatus } from '@/lib/tasting/rules'
import { formatScore, type Results, type WineResult } from '@/lib/tasting/results'
import { cn } from '@/lib/utils'

function WineIdentity({ wine, revealed, delayMs, size = 'md' }: { wine: WineResult; revealed: boolean; delayMs: number; size?: 'lg' | 'md' }) {
  const subtitle = wineDetails(wine)
  const nameClass = cn('font-display font-medium leading-tight tracking-tight', size === 'lg' ? 'text-2xl' : 'text-lg')
  return (
    <div className="min-w-0">
      {wine.name ? (
        <>
          <p className="text-sm text-muted-foreground">{wine.label}</p>
          <p
            key={revealed ? 'revealed' : 'open'}
            className={cn(nameClass, revealed && 'reveal-up')}
            style={{ animationDelay: `${delayMs}ms` }}
          >
            {wine.name}
          </p>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
        </>
      ) : (
        // Blind und noch nicht aufgelöst: die Nummer ist der Name
        <p className={nameClass}>{wine.label}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {wine.ratingCount} {wine.ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}
      </p>
    </div>
  )
}

/** Note im Glasrand; der Ring selbst ist dekorativ, daher eigener Text für Screenreader. */
function ScoreRing({ wine, size, revealed, delayMs }: { wine: WineResult; size: number; revealed: boolean; delayMs: number }) {
  return (
    <div className="relative shrink-0">
      <GlassRing seed={wine.position} size={size} animation={revealed ? 'soak' : undefined} delayMs={delayMs}>
        <span className="flex flex-col items-center">
          <span className={cn('font-display font-medium', size > 120 ? 'text-5xl' : 'text-3xl')}>
            {formatScore(wine.score)}
          </span>
          <span className="text-[11px] text-muted-foreground">von 5</span>
        </span>
      </GlassRing>
      <span className="sr-only">
        Note {formatScore(wine.score)} von 5
      </span>
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

  const [winner, ...runnersUp] = ranked.slice(0, 3)
  const rest = results.wines.slice(1 + runnersUp.length)
  const byPosition = [...results.wines].sort((a, b) => a.position - b.position)

  return (
    <div className="mt-10 grid grid-cols-1 gap-12">
      <ol aria-label="Podest" className="grid grid-cols-1 gap-10">
        {/* Platz 1 groß, mit Namen daneben – die anderen bewusst kleiner */}
        <li className="flex items-center gap-5">
          <ScoreRing wine={winner} size={152} revealed={revealed} delayMs={500} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-wine">Platz {winner.rank}</p>
            <WineIdentity wine={winner} revealed={revealed} delayMs={900} size="lg" />
          </div>
        </li>
        {runnersUp.length > 0 && (
          <li className="grid grid-cols-2 gap-6 sm:max-w-md">
            {runnersUp.map((wine, i) => (
              <div key={wine.wineId}>
                <p className="text-sm font-medium text-wine">Platz {wine.rank}</p>
                <div className="-ml-1 mt-1">
                  <ScoreRing wine={wine} size={92} revealed={revealed} delayMs={250 - i * 250} />
                </div>
                <div className="mt-2">
                  <WineIdentity wine={wine} revealed={revealed} delayMs={650 - i * 250} />
                </div>
              </div>
            ))}
          </li>
        )}
      </ol>

      {rest.length > 0 && (
        <ol aria-label="Weitere Plätze" className="grid grid-cols-1 border-t border-border">
          {rest.map((wine, i) => (
            <li key={wine.wineId} className="flex items-center gap-4 border-b border-border py-2">
              <span className="w-6 text-sm text-muted-foreground">{wine.rank ?? '–'}</span>
              <GlassRing seed={wine.position} state={wine.score === null ? 'open' : 'done'} size={44}>
                <span className="font-display text-sm font-medium">{wine.position}</span>
              </GlassRing>
              <div className="min-w-0 flex-1">
                <WineIdentity wine={wine} revealed={revealed} delayMs={1100 + i * 80} />
              </div>
              <span className="font-display text-xl font-medium">{formatScore(wine.score)}</span>
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
