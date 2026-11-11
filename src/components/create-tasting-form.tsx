'use client'

import { useActionState } from 'react'
import { createTastingAction } from '@/app/new/actions'
import { BottomBar } from '@/components/bottom-bar'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { PRESET_KEYS, PRESETS } from '@/lib/tasting/presets'

export function CreateTastingForm() {
  const [state, action, pending] = useActionState(createTastingAction, undefined)
  const errors = state?.fieldErrors ?? {}
  const preset = state?.values?.preset ?? 'five'

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
          defaultChecked={(state?.values?.blindTasting ?? 'on') === 'on'}
        />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Bewertungssystem</legend>
        <p className="mt-1 text-sm text-muted-foreground">Du kannst die Kriterien danach noch anpassen.</p>
        <div className="mt-3 grid gap-2">
          {PRESET_KEYS.map((key) => (
            <label
              key={key}
              className="flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border border-border bg-background/40 px-4 py-3 lg:bg-card transition-colors has-[:checked]:border-wine has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
            >
              <input type="radio" name="preset" value={key} defaultChecked={preset === key} className="sr-only" />
              <span className="font-medium">{PRESETS[key].label}</span>
              <span className="text-sm text-muted-foreground">{PRESETS[key].hint}</span>
              <span className="mt-1 text-sm">{PRESETS[key].criteria.map((c) => c.name).join(' · ')}</span>
            </label>
          ))}
        </div>
        <FieldError errors={errors.preset} />
      </fieldset>

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
