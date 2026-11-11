import { type Scale } from '@/lib/tasting/presets'
import { formatScore, toScale } from '@/lib/tasting/results'
import { formatPoints, scoring } from '@/lib/tasting/scoring'
import { cn } from '@/lib/utils'

/**
 * "So wird gerechnet": one row per criterion with what it's worth and a bar for its weight,
 * plus the rule in plain words and a worked example. Used when creating, in the admin area and with the results.
 */
export function ScoringExplainer({
  scale,
  criteria,
  className,
}: {
  scale: Scale
  criteria: readonly { name: string; weight: number }[]
  className?: string
}) {
  const s = scoring(scale, criteria)
  const usesPoints = scale !== 'five'
  const heaviest = [...s.criteria].sort((a, b) => b.points - a.points)[0]

  return (
    <div className={className}>
      <ul className="border-t border-border text-sm">
        {s.criteria.map((c) => (
          <Row
            key={c.name}
            label={c.name}
            value={usesPoints ? `${formatPoints(c.points)} Punkte` : s.equalWeights ? 'zählt gleich' : `${Math.round(c.share * 100)} %`}
            width={usesPoints ? c.points / s.max : c.share}
          />
        ))}
        {s.base > 0 && <Row label="Sockel für jeden Wein" value={`${s.base} Punkte`} width={s.base / s.max} muted />}
      </ul>

      <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
        {criteria.length === 1 ? (
          <p>Die Note sind deine Sterne, danach wird über alle Gäste gemittelt. Ergebnis von 5.</p>
        ) : usesPoints ? (
          <>
            <p>
              {s.base > 0 && `Jeder Wein startet mit ${s.base} Punkten. `}
              Pro Kriterium gibt es bis zu den genannten Punkten: 5 Sterne die volle Punktzahl, jeder Stern ein
              Fünftel davon. Die Summe ist deine Note, danach wird über alle Gäste gemittelt. Ergebnis von {s.max}.
            </p>
            {heaviest && (
              <p>
                Beispiel: 4 Sterne bei {heaviest.name} bringen {formatPoints((heaviest.points * 4) / 5)} von{' '}
                {formatPoints(heaviest.points)} Punkten. Überall 4 Sterne ergeben {formatScore(toScale(4, scale), scale)}.
              </p>
            )}
          </>
        ) : (
          <p>
            {s.equalWeights
              ? 'Jedes Kriterium zählt gleich viel. Deine Note ist der Durchschnitt deiner Sterne, '
              : 'Kriterien mit größerem Anteil zählen mehr. Deine Note ist der gewichtete Durchschnitt deiner Sterne, '}
            danach wird über alle Gäste gemittelt. Ergebnis von 5.
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, width, muted }: { label: string; value: string; width: number; muted?: boolean }) {
  return (
    <li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 border-b border-border py-2.5">
      <span className={cn('truncate', muted && 'text-muted-foreground')}>{label}</span>
      <span className="text-muted-foreground">{value}</span>
      {/* Weight bar – decorative, the value next to it carries the information */}
      <span aria-hidden className="col-span-2 h-1 overflow-hidden rounded-full bg-secondary">
        <span
          className={cn('block h-full rounded-full', muted ? 'bg-muted-foreground/40' : 'bg-wine')}
          style={{ width: `${Math.max(width * 100, 2)}%` }}
        />
      </span>
    </li>
  )
}
