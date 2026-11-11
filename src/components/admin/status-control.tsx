'use client'

import { useActionState } from 'react'
import { setStatusAction } from '@/app/tasting/[code]/admin/actions'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { Button, buttonVariants } from '@/components/ui/button'
import { unfinishedGuestsText } from '@/lib/tasting/host-hints'
import { STATUS_LABELS, statusHint, type TastingStatus } from '@/lib/tasting/rules'
import { cn } from '@/lib/utils'

function StatusButton({
  action,
  to,
  label,
  variant = 'default',
  pending,
}: {
  action: (fd: FormData) => void
  to: TastingStatus
  label: string
  variant?: 'default' | 'secondary' | 'ghost'
  pending: boolean
}) {
  return (
    <form action={action}>
      <input type="hidden" name="to" value={to} />
      <Button type="submit" size="lg" variant={variant} className="h-12 w-full" disabled={pending}>
        {label}
      </Button>
    </form>
  )
}

export function StatusControl({
  code,
  status,
  blindTasting = true,
  openGuests = 0,
}: {
  code: string
  status: TastingStatus
  /** Only matters once the tasting runs (finish texts); defaults to the cautious blind wording */
  blindTasting?: boolean
  /** Guests who haven't rated every wine yet – named in the finish dialog */
  openGuests?: number
}) {
  const [state, action, pending] = useActionState(setStatusAction.bind(null, code), undefined)
  // Without blind tasting there's nothing to reveal at the end
  const finishDescription = [
    unfinishedGuestsText(openGuests),
    blindTasting
      ? 'Bewertungen werden gesperrt und die Weinnamen für alle aufgelöst.'
      : 'Bewertungen werden gesperrt.',
    'Du kannst das Tasting danach wieder öffnen.',
  ]
    .filter(Boolean)
    .join(' ')
  return (
    <section aria-labelledby="status-heading" className="rounded-xl bg-card p-5">
      <p id="status-heading" className="text-sm text-muted-foreground">
        Status
      </p>
      <p className="mt-1 font-display text-2xl">{STATUS_LABELS[status]}</p>
      <p className="mt-1 text-sm text-muted-foreground">{statusHint(status, blindTasting)}</p>
      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        {status === 'setup' && <StatusButton action={action} to="active" label="Tasting starten" pending={pending} />}
        {status === 'active' && (
          <>
            <ConfirmSubmit
              action={action}
              hiddenFields={{ to: 'finished' }}
              trigger={blindTasting ? 'Tasting beenden & auflösen' : 'Tasting beenden'}
              triggerClassName={cn(buttonVariants({ size: 'lg' }), 'h-12')}
              title="Tasting beenden?"
              description={finishDescription}
              confirmLabel={blindTasting ? 'Beenden & auflösen' : 'Beenden'}
              disabled={pending}
            />
            <ConfirmSubmit
              action={action}
              hiddenFields={{ to: 'setup' }}
              trigger="Zurück in Vorbereitung"
              triggerClassName={cn(buttonVariants({ size: 'lg', variant: 'ghost' }), 'h-12')}
              title="Zurück in die Vorbereitung?"
              description="Deine Gäste können so lange nicht bewerten. Bisherige Bewertungen bleiben."
              confirmLabel="Zurück in Vorbereitung"
              disabled={pending}
            />
          </>
        )}
        {status === 'finished' && (
          <StatusButton action={action} to="active" label="Wieder öffnen" variant="secondary" pending={pending} />
        )}
      </div>
      {state?.message && !state.ok && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {state.message}
        </p>
      )}
    </section>
  )
}
