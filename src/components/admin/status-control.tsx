'use client'

import { useActionState } from 'react'
import { setStatusAction } from '@/app/tasting/[code]/admin/actions'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { Button, buttonVariants } from '@/components/ui/button'
import { STATUS_HINTS, STATUS_LABELS, type TastingStatus } from '@/lib/tasting/rules'
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

export function StatusControl({ code, status }: { code: string; status: TastingStatus }) {
  const [state, action, pending] = useActionState(setStatusAction.bind(null, code), undefined)
  return (
    <section aria-labelledby="status-heading" className="rounded-2xl bg-card p-5">
      <p id="status-heading" className="text-sm text-muted-foreground">
        Status
      </p>
      <p className="mt-1 font-display text-2xl">{STATUS_LABELS[status]}</p>
      <p className="mt-1 text-sm text-muted-foreground">{STATUS_HINTS[status]}</p>
      <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
        {status === 'setup' && <StatusButton action={action} to="active" label="Tasting starten" pending={pending} />}
        {status === 'active' && (
          <>
            <ConfirmSubmit
              action={action}
              hiddenFields={{ to: 'finished' }}
              trigger="Tasting beenden & auflösen"
              triggerClassName={cn(buttonVariants({ size: 'lg' }), 'h-12')}
              title="Tasting beenden?"
              description="Bewertungen werden gesperrt und die Weinnamen für alle aufgelöst. Du kannst das Tasting danach wieder öffnen."
              confirmLabel="Beenden & auflösen"
            />
            <StatusButton action={action} to="setup" label="Zurück in Vorbereitung" variant="ghost" pending={pending} />
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
