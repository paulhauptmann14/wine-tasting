'use client'

import { useActionState, useRef } from 'react'
import { manageLoginAction } from '@/app/manage/actions'
import { BottomBar } from '@/components/bottom-bar'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useRevealErrors } from '@/components/use-reveal-errors'

export function ManageLoginForm({ defaultCode }: { defaultCode?: string }) {
  const [state, action, pending] = useActionState(manageLoginAction, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  useRevealErrors(formRef, state)
  const errors = state?.fieldErrors ?? {}
  return (
    <form ref={formRef} action={action} noValidate className="grid gap-6">
      <div>
        <Label htmlFor="code">Code</Label>
        <Input
          id="code"
          name="code"
          defaultValue={state?.values?.code ?? defaultCode}
          autoCapitalize="characters"
          autoComplete="off"
          maxLength={6}
          aria-invalid={!!errors.code}
          className="mt-2 h-12 lg:bg-card font-mono text-lg tracking-[0.3em] uppercase"
        />
        <FieldError errors={errors.code} />
      </div>
      <div>
        <Label htmlFor="pin">PIN</Label>
        <Input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="current-password"
          maxLength={12}
          autoFocus={!!defaultCode}
          aria-invalid={!!errors.pin}
          className="mt-2 h-12 lg:bg-card font-mono text-lg tracking-[0.4em]"
        />
        <FieldError errors={errors.pin} />
      </div>
      {state?.message && (
        <p role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
      <BottomBar>
        <Button type="submit" size="lg" className="h-14 w-full text-base lg:w-auto lg:px-10" disabled={pending}>
          Weiter
        </Button>
      </BottomBar>
    </form>
  )
}
