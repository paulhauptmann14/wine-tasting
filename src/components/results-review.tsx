import type { Review, SpreadWine } from '@/lib/tasting/review'
import type { Scale } from '@/lib/tasting/presets'
import { formatScaled } from '@/lib/tasting/results'

function favoriteText({ name, groupRank }: NonNullable<Review['personal']>['favorite']): string {
  if (groupRank === null) return `Dein Favorit: ${name}.`
  if (groupRank === 1) return `Dein Favorit: ${name} – wie bei allen Platz 1.`
  return `Dein Favorit: ${name} – bei allen Platz ${groupRank}.`
}

function SpreadRow({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-b border-border py-3">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="break-words text-pretty">{text}</p>
    </div>
  )
}

/** Personal comparison with the group plus the group's spread; closed by default. */
export function ResultsReview({ review, scale }: { review: Review; scale: Scale }) {
  const { personal, controversial, consensus } = review
  const fmt = (score: number) => formatScaled(score, scale)
  const controversialText = (w: SpreadWine) => `${w.name} – Noten von ${fmt(w.min)} bis ${fmt(w.max)}`
  const consensusText = (w: SpreadWine) => {
    // Compare what is shown: different raw values can round to the same text
    const [lo, hi] = [fmt(w.min), fmt(w.max)]
    return lo === hi ? `${w.name} – alle ${lo}` : `${w.name} – alle zwischen ${lo} und ${hi}`
  }

  return (
    <details className="group max-w-xl">
      <summary className="inline-flex h-12 cursor-pointer list-none items-center gap-2 text-sm font-medium outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
        {personal ? 'Dein Rückblick' : 'Rückblick'}
        <span aria-hidden className="text-muted-foreground transition-transform duration-200 group-open:rotate-90">
          ›
        </span>
      </summary>
      <div className="mt-1 grid grid-cols-1">
        {personal && (
          <>
            <div className="border-l-2 border-wine pl-3">
              <p className="font-display text-lg font-medium leading-tight break-words text-pretty">{favoriteText(personal.favorite)}</p>
              {personal.above && <p className="mt-2 break-words text-pretty">{personal.above.name} mochtest du deutlich mehr als die anderen.</p>}
              {personal.below && <p className="mt-2 break-words text-pretty">{personal.below.name} mochtest du deutlich weniger als die anderen.</p>}
            </div>
            <table className="mt-4 w-full table-fixed border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <td className="w-1/2" />
                  <th scope="col" className="px-2 py-2 text-right font-normal text-muted-foreground">
                    du
                  </th>
                  <th scope="col" className="py-2 pl-2 text-right font-normal text-muted-foreground">
                    die anderen
                  </th>
                </tr>
              </thead>
              <tbody>
                {personal.rows.map((row) => (
                  <tr key={row.position}>
                    <th scope="row" className="border-t border-border py-2 pr-2 text-left font-normal break-words">
                      <span className="tabular-nums text-muted-foreground">{row.position}</span> {row.name}
                    </th>
                    <td className="border-t border-border px-2 py-2 text-right font-display text-lg font-medium tabular-nums">{fmt(row.mine)}</td>
                    <td className="border-t border-border py-2 pl-2 text-right font-display text-lg font-medium tabular-nums">
                      {row.others === null ? <span className="font-sans text-sm font-normal text-muted-foreground">nur du</span> : fmt(row.others)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
        {(controversial || consensus) && (
          <div className={personal ? 'mt-4 border-t border-border' : 'border-t border-border'}>
            {controversial && <SpreadRow label="Am umstrittensten" text={controversialText(controversial)} />}
            {consensus && <SpreadRow label="Am einigsten" text={consensusText(consensus)} />}
          </div>
        )}
      </div>
    </details>
  )
}
