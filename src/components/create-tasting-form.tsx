'use client'

import { useActionState, useRef } from 'react'
import { createTastingAction } from '@/app/new/actions'
import { BottomBar } from '@/components/bottom-bar'
import { describedBy, FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PresetPicker } from '@/components/preset-picker'
import { RequiredLegend, RequiredMark } from '@/components/required-mark'
import { useRevealErrors } from '@/components/use-reveal-errors'
import { RETENTION_DAYS } from '@/lib/tasting/retention'
import type { PresetKey } from '@/lib/tasting/presets'

export function CreateTastingForm() {
  const [state, action, pending] = useActionState(createTastingAction, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  useRevealErrors(formRef, state)
  const errors = state?.fieldErrors ?? {}
  const preset = (state?.values?.preset ?? 'five') as PresetKey

  return (
    <form ref={formRef} action={action} noValidate className="grid gap-8">
      <RequiredLegend className="-mb-4 text-sm text-muted-foreground" />
      <div>
        <Label htmlFor="name">
          Name der Verkostung
          <RequiredMark />
        </Label>
        <Input
          id="name"
          name="name"
          defaultValue={state?.values?.name}
          placeholder="Weinabend 2026"
          maxLength={60}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={describedBy('name', errors.name)}
          className="mt-2 h-12 lg:bg-card text-base"
        />
        <FieldError fieldId="name" errors={errors.name} />
      </div>

      <div>
        <Label htmlFor="description">Beschreibung</Label>
        <Textarea
          id="description"
          name="description"
          defaultValue={state?.values?.description}
          placeholder="Rieslinge von der Mosel. Bring gern Brot mit."
          maxLength={300}
          rows={2}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy('description', errors.description, 'description-hint')}
          className="mt-2 min-h-12 lg:bg-card text-base"
        />
        <p id="description-hint" className="mt-1.5 text-sm text-muted-foreground">
          Optional. Steht unter dem Namen, für alle mit dem Code sichtbar.
        </p>
        <FieldError fieldId="description" errors={errors.description} />
      </div>

      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="blindTasting">Blindverkostung</Label>
          <p className="mt-1 text-sm text-muted-foreground">
            Gäste sehen nur „Wein #1“. Die Namen werden am Ende aufgelöst.
          </p>
        </div>
        <Switch
          // Radix keeps its first checked state as the reset target, and React resets the form after
          // every action: remount when the returned value changes, or a failed submit switches it off
          key={state?.values?.blindTasting ?? 'init'}
          id="blindTasting"
          name="blindTasting"
          defaultChecked={state?.values?.blindTasting === 'on'}
        />
      </div>

      <PresetPicker
        hint="Gäste geben immer 1–5 Sterne, egal welches System. Die Kriterien kannst du danach noch anpassen."
        defaultValue={preset}
        recommended="five"
        collapseExplainer
        errors={errors.preset}
      />

      <div>
        <Label htmlFor="pin">
          Deine Gastgeber-PIN
          <RequiredMark />
        </Label>
        {/* Visible on purpose: it can't be reset, so the host should see what they typed */}
        <Input
          id="pin"
          name="pin"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={12}
          required
          aria-required="true"
          aria-invalid={!!errors.pin}
          aria-describedby={describedBy('pin', errors.pin, 'pin-hint')}
          className="mt-2 h-12 lg:bg-card font-mono text-lg tracking-[0.4em]"
        />
        <p id="pin-hint" className="mt-1.5 text-sm text-muted-foreground">
          4–12 Ziffern. Damit verwaltest du das Tasting später. Schreib sie dir auf – sie lässt sich nicht
          zurücksetzen.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Nach {RETENTION_DAYS} Tagen wird das Tasting mit allen Bewertungen automatisch gelöscht.
        </p>
        <FieldError fieldId="pin" errors={errors.pin} />
      </div>

      <BottomBar>
        <Button type="submit" size="lg" className="h-14 w-full text-base lg:w-auto lg:px-10" disabled={pending}>
          {pending ? 'Wird erstellt …' : 'Verkostung erstellen'}
        </Button>
      </BottomBar>
    </form>
  )
}
