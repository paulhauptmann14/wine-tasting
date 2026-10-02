'use client'

import { useActionState, useState } from 'react'
import { BottomBar } from '@/components/bottom-bar'
import { StarRating } from '@/components/star-rating'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { ActionState } from '@/lib/action-state'

type Criterion = { id: string; name: string; scaleMin: number; scaleMax: number }

type RatingFormProps = {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>
  criteria: Criterion[]
  initialValues: Record<string, number>
  initialNotes: string
  isLast: boolean
}

export function RatingForm({ action, criteria, initialValues, initialNotes, isLast }: RatingFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const [values, setValues] = useState<Record<string, number>>(initialValues)
  const [notes, setNotes] = useState(initialNotes)

  return (
    <form action={formAction} noValidate className="mt-8 grid gap-8">
      <div className="border-t border-border">
        {criteria.map((c) => (
          <StarRating
            key={c.id}
            name={`c_${c.id}`}
            label={c.name}
            min={c.scaleMin}
            max={c.scaleMax}
            value={values[c.id] ?? null}
            onChange={(v) => setValues((prev) => ({ ...prev, [c.id]: v }))}
            invalid={!!state?.fieldErrors?.[`c_${c.id}`] && values[c.id] === undefined}
          />
        ))}
      </div>

      <div>
        <Label htmlFor="notes" className="text-sm font-normal text-muted-foreground">
          Was schmeckst du?
        </Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={1000}
          rows={3}
          placeholder="Fruchtig, etwas Säure, grüner Apfel …"
          className="mt-2 bg-card text-base"
        />
      </div>

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}

      <BottomBar>
        <Button type="submit" size="lg" className="h-14 w-full text-base lg:w-auto lg:px-10" disabled={pending}>
          {pending ? 'Speichert …' : isLast ? 'Speichern & fertig' : 'Speichern & weiter'}
        </Button>
      </BottomBar>
    </form>
  )
}
