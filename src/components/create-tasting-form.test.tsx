// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { createTastingAction } from '@/app/new/actions'

vi.mock('@/app/new/actions', () => ({ createTastingAction: vi.fn() }))

import { CreateTastingForm } from './create-tasting-form'

// Radix Switch measures itself; jsdom has no ResizeObserver
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })
// useRevealErrors scrolls to the first invalid field; jsdom has neither scrollIntoView nor matchMedia
Element.prototype.scrollIntoView = vi.fn()
window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never

const PIN_ERROR = 'Bitte gib eine PIN mit 4–12 Ziffern ein.'

beforeEach(() => {
  vi.mocked(createTastingAction).mockReset()
  // Echoes the submitted values back with a PIN error, like the real action on a validation failure
  vi.mocked(createTastingAction).mockImplementation(async (_prev, fd: FormData) => ({
    ok: false,
    fieldErrors: { pin: [PIN_ERROR] },
    values: {
      name: String(fd.get('name') ?? ''),
      description: String(fd.get('description') ?? ''),
      preset: String(fd.get('preset') ?? ''),
      blindTasting: fd.get('blindTasting') === 'on' ? 'on' : 'off',
    },
  }))
})

it('marks name and PIN as required, with one legend', () => {
  render(<CreateTastingForm />)
  expect(screen.getAllByText('Pflichtfeld')).toHaveLength(1)
  for (const name of ['Name der Verkostung', 'Deine Gastgeber-PIN']) {
    const field = screen.getByRole('textbox', { name })
    expect(field).toBeRequired()
    expect(field).toHaveAttribute('aria-required', 'true')
  }
  const stars = document.querySelectorAll('label [data-slot="required-mark"]')
  expect(stars).toHaveLength(2)
  for (const star of stars) expect(star).toHaveAttribute('aria-hidden', 'true')
})

it('keeps blind tasting switched on after a failed submit', async () => {
  const user = userEvent.setup()
  render(<CreateTastingForm />)
  await user.type(screen.getByRole('textbox', { name: 'Name der Verkostung' }), 'Weinabend')
  await user.click(screen.getByRole('switch', { name: 'Blindverkostung' }))
  await user.click(screen.getByRole('button', { name: 'Verkostung erstellen' }))

  expect(await screen.findByText(PIN_ERROR)).toBeInTheDocument()
  expect(screen.getByRole('switch', { name: 'Blindverkostung' })).toHaveAttribute('aria-checked', 'true')

  // Sent again with the PIN filled in: still blind
  await user.type(screen.getByRole('textbox', { name: 'Deine Gastgeber-PIN' }), '1234')
  await user.click(screen.getByRole('button', { name: 'Verkostung erstellen' }))
  const fd = vi.mocked(createTastingAction).mock.calls[1][1] as FormData
  expect(fd.get('blindTasting')).toBe('on')
})

it('keeps blind tasting off after a failed submit when it was off', async () => {
  const user = userEvent.setup()
  render(<CreateTastingForm />)
  await user.click(screen.getByRole('button', { name: 'Verkostung erstellen' }))
  expect(await screen.findByText(PIN_ERROR)).toBeInTheDocument()
  expect(screen.getByRole('switch', { name: 'Blindverkostung' })).toHaveAttribute('aria-checked', 'false')
})

it('links the error text to its field, next to the hint', async () => {
  const user = userEvent.setup()
  render(<CreateTastingForm />)
  const pin = screen.getByRole('textbox', { name: 'Deine Gastgeber-PIN' })
  expect(pin).not.toHaveAccessibleDescription(expect.stringContaining(PIN_ERROR))
  await user.click(screen.getByRole('button', { name: 'Verkostung erstellen' }))
  await screen.findByText(PIN_ERROR)
  expect(pin).toHaveAccessibleDescription(expect.stringContaining(PIN_ERROR))
  expect(pin).toHaveAccessibleDescription(expect.stringContaining('4–12 Ziffern'))
})
