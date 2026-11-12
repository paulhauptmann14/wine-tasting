'use client'

import { useActionState, useState, useTransition } from 'react'
import { updateBlindTastingAction, updateSettingsAction } from '@/app/tasting/[code]/admin/actions'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

export function SettingsForm({
  code,
  name,
  description,
  blindTasting,
  blindLocked,
}: {
  code: string
  name: string
  description: string | null
  blindTasting: boolean
  blindLocked: boolean
}) {
  const [state, action, pending] = useActionState(updateSettingsAction.bind(null, code), undefined)
  const [blind, setBlind] = useState(blindTasting)
  const [blindNote, setBlindNote] = useState<{ text: string; error: boolean } | null>(null)
  const [saving, startSaving] = useTransition()

  function toggleBlind(next: boolean) {
    setBlind(next)
    setBlindNote(null)
    startSaving(async () => {
      const result = await updateBlindTastingAction(code, next)
      if (result?.ok) {
        setBlindNote({ text: 'Gespeichert.', error: false })
      } else {
        // Revert to the saved state so the switch doesn't show something wrong
        setBlind(!next)
        setBlindNote({ text: result?.message ?? 'Konnte nicht gespeichert werden.', error: true })
      }
    })
  }

  return (
    <div className="grid gap-8">
      <form action={action} noValidate className="grid gap-5">
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
        <div>
          <Label htmlFor="settings-description">Beschreibung</Label>
          <Textarea
            id="settings-description"
            name="description"
            defaultValue={state?.values?.description ?? description ?? ''}
            placeholder="Rieslinge von der Mosel. Bring gern Brot mit."
            maxLength={300}
            rows={2}
            aria-invalid={!!state?.fieldErrors?.description}
            aria-describedby="settings-description-hint"
            className="mt-2 min-h-12 text-base"
          />
          <p id="settings-description-hint" className="mt-1.5 text-sm text-muted-foreground">
            Optional. Steht unter dem Namen, für alle mit dem Code sichtbar.
          </p>
          <FieldError errors={state?.fieldErrors?.description} />
        </div>
        <div className="flex items-center gap-4">
          <Button type="submit" size="lg" variant="outline" className="h-12" disabled={pending}>
            Speichern
          </Button>
          {state?.ok && (
            <p aria-live="polite" className="text-sm text-muted-foreground">
              {state.message}
            </p>
          )}
        </div>
      </form>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="settings-blind">Blindverkostung</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            {!blindLocked
              ? 'Namen bleiben für Gäste bis zum Ende verborgen. Wird sofort gespeichert.'
              : blind
                ? 'Lässt sich nur in der Vorbereitung ändern – sonst wären die Namen sofort aufgelöst.'
                : 'Lässt sich nur in der Vorbereitung ändern.'}
          </p>
          <p
            aria-live="polite"
            className={blindNote?.error ? 'mt-1 text-sm text-destructive' : 'mt-1 text-sm text-muted-foreground'}
          >
            {saving ? 'Speichert …' : blindNote?.text}
          </p>
        </div>
        <Switch
          id="settings-blind"
          checked={blind}
          onCheckedChange={toggleBlind}
          disabled={blindLocked || saving}
        />
      </div>
    </div>
  )
}
