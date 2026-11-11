import { GlassRing } from '@/components/glass-ring'
import { ScoringExplainer } from '@/components/scoring-explainer'
import { wineDetails } from '@/lib/tasting/display'
import type { TastingStatus } from '@/lib/tasting/rules'
import { SCALES, type Scale } from '@/lib/tasting/presets'
import { formatScore, toScale, type Results, type WineResult } from '@/lib/tasting/results'
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
        // Blind and not yet revealed: the number is the name
        <p className={nameClass}>{wine.label}</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {wine.ratingCount} {wine.ratingCount === 1 ? 'Bewertung' : 'Bewertungen'}
      </p>
    </div>
  )
}

/** Score inside the glass ring; the ring itself is decorative, hence separate text for screen readers. */
function ScoreRing({
  wine,
  size,
  revealed,
  delayMs,
  scale,
}: {
  wine: WineResult
  size: number
  revealed: boolean
  delayMs: number
  scale: Scale
}) {
  const score = formatScore(toScale(wine.score, scale), scale)
  const max = SCALES[scale].max
  return (
    <div className="relative shrink-0">
      <GlassRing seed={wine.position} size={size} animation={revealed ? 'soak' : undefined} delayMs={delayMs}>
        <span className="flex flex-col items-center">
          <span className={cn('font-display font-medium', size > 120 ? 'text-5xl' : 'text-3xl')}>
            {score}
          </span>
          <span className="text-[11px] text-muted-foreground">von {max}</span>
        </span>
      </GlassRing>
      <span className="sr-only">
        Note {score} von {max}
      </span>
    </div>
  )
}

/** Guests' notes without names, per wine in the order of the evening. */
function WineNotes({ wines, notes }: { wines: WineResult[]; notes: Record<string, string[]> }) {
  const withNotes = wines.filter((w) => notes[w.wineId]?.length)
  if (withNotes.length === 0) return null
  return (
    <section aria-labelledby="notes-heading">
      <h2 id="notes-heading" className="font-display text-2xl font-medium">
        Notizen
      </h2>
      <ul className="mt-3 grid grid-cols-1 border-t border-border">
        {withNotes.map((wine) => (
          <li key={wine.wineId} className="flex gap-4 border-b border-border py-4">
            <GlassRing seed={wine.position} size={44}>
              <span className="font-display text-sm font-medium">{wine.position}</span>
            </GlassRing>
            <div className="min-w-0 flex-1">
              <p className="font-display text-lg font-medium leading-tight">{wine.name ?? wine.label}</p>
              <ul className="mt-2 grid grid-cols-1 gap-2">
                {notes[wine.wineId].map((note, i) => (
                  <li key={i} className="whitespace-pre-line break-words text-pretty text-muted-foreground">
                    „{note}“
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ResultsView({
  results,
  status,
  scale = 'five',
  notes,
}: {
  results: Results
  status: TastingStatus
  scale?: Scale
  notes?: Record<string, string[]>
}) {
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
        {/* First place large, with the name beside it – the others deliberately smaller */}
        <li className="flex items-center gap-5">
          <ScoreRing wine={winner} size={152} revealed={revealed} delayMs={500} scale={scale} />
          <div className="min-w-0">
            <p className="text-sm font-medium text-wine">Platz {winner.rank}</p>
            <WineIdentity wine={winner} revealed={revealed} delayMs={900} size="lg" />
          </div>
        </li>
        {runnersUp.length > 0 && (
          <li className="grid grid-cols-2 gap-6 sm:max-w-md md:max-w-none">
            {runnersUp.map((wine, i) => (
              <div key={wine.wineId}>
                <p className="text-sm font-medium text-wine">Platz {wine.rank}</p>
                <div className="-ml-1 mt-1">
                  <ScoreRing wine={wine} size={92} revealed={revealed} delayMs={250 - i * 250} scale={scale} />
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
              <span className="font-display text-xl font-medium">{formatScore(toScale(wine.score, scale), scale)}</span>
            </li>
          ))}
        </ol>
      )}

      {notes && <WineNotes wines={byPosition} notes={notes} />}

      <div className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        <table className="w-full min-w-max border-separate border-spacing-0 text-sm">
          <caption className="mb-3 text-left text-sm font-medium text-muted-foreground">
            Durchschnitt je Kriterium in Sternen, Note von {SCALES[scale].max}
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
                  {formatScore(toScale(w.score, scale), scale)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <details className="group max-w-xl">
        <summary className="inline-flex h-12 cursor-pointer list-none items-center gap-2 text-sm font-medium outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
          So wird gerechnet
          <span aria-hidden className="text-muted-foreground transition-transform duration-200 group-open:rotate-90">
            ›
          </span>
        </summary>
        <ScoringExplainer scale={scale} criteria={results.criteria} className="mt-1" />
      </details>
    </div>
  )
}
