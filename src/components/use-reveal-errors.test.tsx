// @vitest-environment jsdom
import { useRef } from 'react'
import { render } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { ActionState } from '@/lib/action-state'
import { useRevealErrors } from './use-reveal-errors'

const scrollIntoView = vi.fn()
beforeEach(() => {
  // jsdom has neither scrollIntoView nor matchMedia
  Element.prototype.scrollIntoView = scrollIntoView
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never
})
afterEach(() => scrollIntoView.mockReset())

function Form({ state, invalidName = false }: { state: ActionState; invalidName?: boolean }) {
  const ref = useRef<HTMLFormElement>(null)
  useRevealErrors(ref, state)
  return (
    <form ref={ref}>
      <input aria-label="Name" aria-invalid={invalidName} />
      {state?.message && <p role="alert">{state.message}</p>}
    </form>
  )
}

it('scrolls the first invalid field into view and focuses it – the fixed bottom bar may hide it otherwise', () => {
  const { getByLabelText } = render(<Form state={{ fieldErrors: { name: ['Fehlt'] } }} invalidName />)
  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'smooth' })
  expect(getByLabelText('Name')).toHaveFocus()
})

it('falls back to the alert message when no field is invalid', () => {
  const { getByRole } = render(<Form state={{ message: 'Der Gastgeber hat die Reihenfolge geändert.' }} />)
  expect(scrollIntoView).toHaveBeenCalledTimes(1)
  expect(scrollIntoView.mock.contexts[0]).toBe(getByRole('alert'))
})

it('stays still on success and before the first submit', () => {
  render(<Form state={undefined} />)
  render(<Form state={{ ok: true, message: 'Gespeichert.' }} />)
  expect(scrollIntoView).not.toHaveBeenCalled()
})

it('jumps without animation when reduced motion is requested', () => {
  window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as never
  render(<Form state={{ message: 'Fehler' }} />)
  expect(scrollIntoView).toHaveBeenCalledWith({ block: 'center', behavior: 'auto' })
})
