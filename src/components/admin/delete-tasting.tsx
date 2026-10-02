'use client'

import { useActionState, useState } from 'react'
import { deleteTastingAction } from '@/app/tasting/[code]/admin/actions'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function DeleteTasting({ code }: { code: string }) {
  const [state, action, pending] = useActionState(deleteTastingAction.bind(null, code), undefined)
  const [typed, setTyped] = useState('')
  const matches = typed.trim().toUpperCase() === code

  return (
    <section aria-labelledby="delete-heading" className="border-t border-border pt-6">
      <h2 id="delete-heading" className="font-display text-xl font-medium">
        Tasting löschen
      </h2>
      <p className="mt-1 max-w-[46ch] text-sm text-muted-foreground">
        Weine, Gäste und alle Bewertungen werden endgültig gelöscht. Das lässt sich nicht rückgängig machen.
      </p>
      <form action={action} noValidate className="mt-4 grid gap-3 sm:flex sm:items-start">
        <div className="sm:w-48">
          <Label htmlFor="delete-confirm" className="text-sm font-normal text-muted-foreground">
            Zur Bestätigung den Code <span className="font-mono text-foreground">{code}</span> eingeben
          </Label>
          <Input
            id="delete-confirm"
            name="confirm"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            autoCapitalize="characters"
            maxLength={6}
            aria-invalid={!!state?.fieldErrors?.confirm}
            className="mt-2 h-12 font-mono tracking-[0.3em] uppercase"
          />
          <FieldError errors={state?.fieldErrors?.confirm} />
        </div>
        <Button type="submit" variant="destructive" size="lg" className="h-12 sm:mt-7" disabled={!matches || pending}>
          Endgültig löschen
        </Button>
      </form>
    </section>
  )
}
