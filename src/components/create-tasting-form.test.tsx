// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

vi.mock('@/app/new/actions', () => ({ createTastingAction: vi.fn() }))

import { CreateTastingForm } from './create-tasting-form'

// Radix Switch measures itself; jsdom has no ResizeObserver
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })

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
