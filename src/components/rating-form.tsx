'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import { BottomBar } from '@/components/bottom-bar'
import { StarRating } from '@/components/star-rating'
import { textLink, textLinkFocus } from '@/components/styles'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useRevealErrors } from '@/components/use-reveal-errors'
import type { FormAction } from '@/lib/action-state'
import { LIMITS } from '@/lib/limits'
import { cn } from '@/lib/utils'

type Criterion = { id: string; name: string; scaleMin: number; scaleMax: number }

type RatingFormProps = {
  action: FormAction
  criteria: Criterion[]
  initialValues: Record<string, number>
  initialNotes: string
  isLast: boolean
}

export function RatingForm({ action, criteria, initialValues, initialNotes, isLast }: RatingFormProps) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  useRevealErrors(formRef, state)
  // After a failed save, put the focus on the first row that still needs stars. The scrolling is
  // done by useRevealErrors (to the same [aria-invalid] element), so no second scroll here.
  useEffect(() => {
    if (!state?.fieldErrors) return
    formRef.current
      ?.querySelector<HTMLElement>('[role="radiogroup"][aria-invalid="true"] [role="radio"][tabindex="0"]')
      ?.focus({ preventScroll: true })
  }, [state])
  const [values, setValues] = useState<Record<string, number>>(initialValues)
  const [notes, setNotes] = useState(initialNotes)

  return (
    <form ref={formRef} action={formAction} noValidate className="mt-8 grid gap-8">
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
          Was schmeckst du? (freiwillig)
        </Label>
        <Textarea
          id="notes"
          name="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={LIMITS.ratingNotes}
          rows={3}
          aria-describedby="notes-hint"
          placeholder="Fruchtig, etwas Säure, grüner Apfel …"
          className="mt-2 bg-card text-base"
        />
        <p id="notes-hint" className="mt-2 text-sm text-muted-foreground">
          Wird am Ende ohne deinen Namen allen gezeigt.
        </p>
      </div>

      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
          {/* Full reload: the wine at this number has changed, the form must start over */}
          {state.reload && (
            <a href="" className={cn(textLink, textLinkFocus, 'flex w-fit text-foreground')}>
              Seite neu laden
            </a>
          )}
        </p>
      )}

      <BottomBar>
        <Button type="submit" size="main" disabled={pending}>
          {pending ? 'Speichert …' : isLast ? 'Speichern & fertig' : 'Speichern & weiter'}
        </Button>
      </BottomBar>
    </form>
  )
}
