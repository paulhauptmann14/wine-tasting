'use client'

import { useEffect, type RefObject } from 'react'
import type { ActionState } from '@/lib/action-state'

/**
 * After a failed submit, bring the problem into view: the first invalid field (focused, so the
 * keyboard opens) or else the alert message. Forms with the fixed bottom bar otherwise hide their
 * own feedback – the guest taps "Speichern" and nothing seems to happen.
 */
export function useRevealErrors(form: RefObject<HTMLFormElement | null>, state: ActionState) {
  useEffect(() => {
    if (!state || state.ok) return
    const root = form.current
    const target =
      root?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? root?.querySelector<HTMLElement>('[role="alert"]')
    if (!target) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    target.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' })
    if (target.matches('input, textarea, select')) target.focus({ preventScroll: true })
  }, [form, state])
}
