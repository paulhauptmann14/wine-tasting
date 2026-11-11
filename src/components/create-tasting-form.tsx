'use client'

import { useActionState } from 'react'
import { createTastingAction } from '@/app/new/actions'
import { BottomBar } from '@/components/bottom-bar'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PresetPicker } from '@/components/preset-picker'
import { RETENTION_DAYS } from '@/lib/tasting/retention'
import type { PresetKey } from '@/lib/tasting/presets'

export function CreateTastingForm() {
  const [state, action, pending] = useActionState(createTastingAction, undefined)
  const errors = state?.fieldErrors ?? {}
  const preset = (state?.values?.preset ?? 'five') as PresetKey

  return (
    <form action={action} noValidate className="grid gap-8">
      <div>
        <Label htmlFor="name">Name der Verkostung</Label>
        <Input
          id="name"
          name="name"
          defaultValue={state?.values?.name}
          placeholder="Weinabend 2026"
          maxLength={60}
          aria-invalid={!!errors.name}
          className="mt-2 h-12 lg:bg-card text-base"
        />
        <FieldError errors={errors.name} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="blindTasting">Blindverkostung</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Gäste sehen nur „Wein #1“. Die Namen werden am Ende aufgelöst.
          </p>
        </div>
        <Switch
          id="blindTasting"
          name="blindTasting"
          defaultChecked={state?.values?.blindTasting === 'on'}
        />
      </div>

      <PresetPicker
        hint="Du kannst die Kriterien danach noch anpassen."
        defaultValue={preset}
        errors={errors.preset}
      />

      <div>
        <Label htmlFor="pin">Admin-PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          maxLength={12}
          aria-invalid={!!errors.pin}
          className="mt-2 h-12 lg:bg-card font-mono text-lg tracking-[0.4em]"
        />
        <p className="mt-1.5 text-sm text-muted-foreground">4–12 Ziffern. Damit verwaltest du das Tasting später.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nach {RETENTION_DAYS} Tagen wird das Tasting mit allen Bewertungen automatisch gelöscht.
        </p>
        <FieldError errors={errors.pin} />
      </div>

      <BottomBar>
        <Button type="submit" size="lg" className="h-14 w-full text-base lg:w-auto lg:px-10" disabled={pending}>
          {pending ? 'Wird erstellt …' : 'Verkostung erstellen'}
        </Button>
      </BottomBar>
    </form>
  )
}
