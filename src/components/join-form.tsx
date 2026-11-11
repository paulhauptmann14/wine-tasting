'use client'

import { useActionState } from 'react'
import { BottomBar } from '@/components/bottom-bar'
import { FieldError } from '@/components/field-error'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FormAction } from '@/lib/action-state'

export function JoinForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  return (
    <form action={formAction} noValidate className="relative mt-10">
      <Label htmlFor="name" className="text-base">
        Wie heißt du?
      </Label>
      <Input
        id="name"
        name="name"
        defaultValue={state?.values?.name}
        autoComplete="given-name"
        autoFocus
        maxLength={40}
        aria-invalid={!!state?.fieldErrors?.name}
        className="mt-2 h-14 border-foreground/40 bg-card text-lg lg:max-w-md"
      />
      <FieldError errors={state?.fieldErrors?.name} />
      <BottomBar>
        <Button type="submit" size="lg" className="h-14 w-full text-base lg:w-auto lg:px-10" disabled={pending}>
          Beitreten
        </Button>
      </BottomBar>
    </form>
  )
}
