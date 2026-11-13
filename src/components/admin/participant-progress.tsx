'use client'

import { Trash2 } from 'lucide-react'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { GlassRingDefs, GlassRingUse } from '@/components/glass-ring'
import { iconButtonClass } from '@/components/ui/button'
import { RING_STATE_TEXT, type RingState } from '@/lib/tasting/progress'
import { cn } from '@/lib/utils'

// Client components on purpose: the host's page refreshes every 5 s, and this way each refresh
// carries only the ring states of a guest instead of the drawn rings (30 guests × 12 wines).

const ID_PREFIX = 'guest-ring'

/** The ring shapes of the progress rows, once per page. */
export function ParticipantRingShapes({ count }: { count: number }) {
  return <GlassRingDefs idPrefix={ID_PREFIX} count={count} />
}

type RowRestProps = {
  name: string
  wines: RingState[]
  /** Bound server action that removes this guest */
  removeAction: (formData: FormData) => void | Promise<void>
}

/** Delete button and progress rings of a guest's row; needs <ParticipantRingShapes> on the page. */
export function ParticipantRowRest({ name, wines, removeAction }: RowRestProps) {
  return (
    <>
      <ConfirmSubmit
        action={removeAction}
        trigger={<Trash2 className="size-5" />}
        triggerLabel={`${name} entfernen`}
        triggerClassName={cn(iconButtonClass, 'shrink-0')}
        title={`${name} entfernen?`}
        description="Die Bewertungen dieser Person werden gelöscht und zählen nicht mehr im Ergebnis. Sie kann danach neu beitreten."
        confirmLabel="Entfernen"
      />
      {/* One small ring per wine: who is still missing where? */}
      <ol aria-label={`Fortschritt von ${name}`} className="-mt-1 flex basis-full flex-wrap gap-1 pb-1">
        {wines.map((state, i) => (
          <li key={i}>
            <GlassRingUse
              idPrefix={ID_PREFIX}
              seed={i + 1}
              state={state}
              size={28}
              label={`Wein #${i + 1}: ${RING_STATE_TEXT[state]}`}
            >
              <span className="text-[10px] font-medium">{i + 1}</span>
            </GlassRingUse>
          </li>
        ))}
      </ol>
    </>
  )
}
