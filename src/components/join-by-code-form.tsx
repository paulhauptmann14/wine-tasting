'use client'

import { useActionState } from 'react'
import { goToTastingAction } from '@/app/actions'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function JoinByCodeForm({
  className,
  defaultCode,
  layout = 'stack',
}: {
  className?: string
  defaultCode?: string
  /** row: from lg, field and button side by side (home page on laptop) */
  layout?: 'stack' | 'row'
}) {
  const [state, action, pending] = useActionState(goToTastingAction, undefined)
  const error = state?.fieldErrors?.code
  return (
    <form
      action={action}
      noValidate
      className={cn('grid gap-2', layout === 'row' && 'lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start', className)}
    >
      <div>
        <Label htmlFor="join-code" className="sr-only">
          Code vom Gastgeber
        </Label>
        <Input
          id="join-code"
          name="code"
          defaultValue={state?.values?.code ?? defaultCode}
          placeholder="CODE"
          autoCapitalize="characters"
          autoComplete="off"
          spellCheck={false}
          maxLength={6}
          aria-invalid={!!error}
          aria-describedby={error ? 'join-code-error' : undefined}
          className="h-14 border-foreground/40 bg-card font-mono text-lg tracking-[0.35em] uppercase"
        />
        <FieldError id="join-code-error" errors={error} />
      </div>
      <Button
        type="submit"
        size="lg"
        className={cn('h-12 text-base', layout === 'row' && 'lg:h-14 lg:px-8')}
        disabled={pending}
      >
        Beitreten
      </Button>
    </form>
  )
}
