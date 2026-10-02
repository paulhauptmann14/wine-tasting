'use client'

import { useActionState } from 'react'
import { updateSettingsAction } from '@/app/tasting/[code]/admin/actions'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export function SettingsForm({
  code,
  name,
  blindTasting,
  blindLocked,
}: {
  code: string
  name: string
  blindTasting: boolean
  blindLocked: boolean
}) {
  const [state, action, pending] = useActionState(updateSettingsAction.bind(null, code), undefined)
  return (
    <form action={action} noValidate className="grid gap-6">
      <div>
        <Label htmlFor="settings-name">Name der Verkostung</Label>
        <Input
          id="settings-name"
          name="name"
          defaultValue={state?.values?.name ?? name}
          maxLength={60}
          aria-invalid={!!state?.fieldErrors?.name}
          className="mt-2 h-12 text-base"
        />
        <FieldError errors={state?.fieldErrors?.name} />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="settings-blind">Blindverkostung</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            {blindLocked
              ? 'Lässt sich nur in der Vorbereitung ändern – sonst wären die Namen sofort aufgelöst.'
              : 'Namen bleiben für Gäste bis zum Ende verborgen.'}
          </p>
        </div>
        <Switch id="settings-blind" name="blindTasting" defaultChecked={blindTasting} disabled={blindLocked} />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" size="lg" variant="outline" className="h-12" disabled={pending}>
          Änderungen speichern
        </Button>
        {state?.ok && (
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {state.message}
          </p>
        )}
      </div>
    </form>
  )
}
