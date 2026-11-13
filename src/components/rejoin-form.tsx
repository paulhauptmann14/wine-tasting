'use client'

import { useActionState, useRef } from 'react'
import { BottomBar } from '@/components/bottom-bar'
import { Button } from '@/components/ui/button'
import { useRevealErrors } from '@/components/use-reveal-errors'
import type { FormAction } from '@/lib/action-state'

/** Only a button: opening the rejoin link never signs in by itself (link previews fetch it too). */
export function RejoinForm({ action, name }: { action: FormAction; name: string }) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const formRef = useRef<HTMLFormElement>(null)
  useRevealErrors(formRef, state)
  return (
    <form ref={formRef} action={formAction} className="relative">
      {state?.message && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {state.message}
        </p>
      )}
      <BottomBar>
        <Button
          type="submit"
          size="lg"
          className="h-14 w-full text-base lg:w-auto lg:px-10"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? 'Einen Moment …' : `Als ${name} weitermachen`}
        </Button>
      </BottomBar>
    </form>
  )
}
