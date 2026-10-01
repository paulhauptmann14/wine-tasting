'use client'

import { useActionState } from 'react'
import { goToTastingAction } from '@/app/actions'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'

export function JoinByCodeForm({ className, defaultCode }: { className?: string; defaultCode?: string }) {
  const [state, action, pending] = useActionState(goToTastingAction, undefined)
  const error = state?.fieldErrors?.code
  return (
    <form action={action} noValidate className={cn('flex items-start gap-2', className)}>
      <div className="flex-1">
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
          className="h-14 font-mono text-lg tracking-[0.3em] uppercase"
        />
        <FieldError id="join-code-error" errors={error} />
      </div>
      <Button type="submit" size="lg" variant="secondary" className="h-14 px-6" disabled={pending}>
        Beitreten
      </Button>
    </form>
  )
}
