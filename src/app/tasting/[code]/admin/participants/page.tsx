import { Trash2 } from 'lucide-react'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { AutoRefresh } from '@/components/auto-refresh'
import { GlassRing } from '@/components/glass-ring'
import { marginNote } from '@/components/styles'
import { iconButtonClass } from '@/components/ui/button'
import { db } from '@/db/client'
import { getAdminTasting } from '@/lib/data'
import { duplicateNameHint, findDuplicateNames, isDuplicateName } from '@/lib/tasting/host-hints'
import { RING_STATE_TEXT, type RingState } from '@/lib/tasting/progress'
import { cn } from '@/lib/utils'
import { listParticipantProgress } from '@/server/participants'
import { removeParticipantAction } from '../actions'

const LEGEND: { state: RingState; text: string }[] = [
  { state: 'done', text: 'bewertet' },
  { state: 'open', text: 'offen' },
  { state: 'incomplete', text: 'Kriterium fehlt' },
]

export default async function ParticipantsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const people = await listParticipantProgress(db, tasting.id)

  if (people.length === 0) {
    return (
      <>
        {tasting.status !== 'finished' && <AutoRefresh />}
        <p className="text-muted-foreground">Noch niemand da. Teile den QR-Code, damit deine Gäste beitreten können.</p>
      </>
    )
  }
  // Same name twice: usually a guest on a new device (the session cookie is per browser)
  const duplicates = findDuplicateNames(people.map((p) => p.name))
  const firstDuplicate = duplicates.values().next().value
  return (
    <>
      {tasting.status !== 'finished' && <AutoRefresh />}
      {firstDuplicate && <p className={cn(marginNote, 'mb-6')}>{duplicateNameHint(firstDuplicate)}</p>}
      <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Ein Kreis je Wein:</span>
        {LEGEND.map(({ state, text }, i) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <GlassRing seed={i + 1} state={state} size={18} />
            {text}
          </span>
        ))}
      </p>
      <ul className="grid grid-cols-1 border-t border-border">
        {people.map((p) => (
          <li key={p.id} className="border-b border-border py-2">
            <div className="flex items-center gap-3">
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="truncate font-medium">{p.name}</span>
                {isDuplicateName(duplicates, p.name) && (
                  <span className="shrink-0 text-sm text-muted-foreground">doppelt</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-sm text-muted-foreground">
                {p.doneCount} / {p.wines.length}
              </span>
              <ConfirmSubmit
                action={removeParticipantAction.bind(null, tasting.code, p.id)}
                trigger={<Trash2 className="size-5" />}
                triggerLabel={`${p.name} entfernen`}
                triggerClassName={cn(iconButtonClass, 'shrink-0')}
                title={`${p.name} entfernen?`}
                description="Die Bewertungen dieser Person werden gelöscht und zählen nicht mehr im Ergebnis. Sie kann danach neu beitreten."
                confirmLabel="Entfernen"
              />
            </div>
            {/* One small ring per wine: who is still missing where? */}
            <ol aria-label={`Fortschritt von ${p.name}`} className="-mt-1 flex flex-wrap gap-1 pb-1">
              {p.wines.map((state, i) => (
                <li key={i}>
                  <GlassRing seed={i + 1} state={state} size={28} label={`Wein #${i + 1}: ${RING_STATE_TEXT[state]}`}>
                    <span className="text-[10px] font-medium">{i + 1}</span>
                  </GlassRing>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ul>
    </>
  )
}
