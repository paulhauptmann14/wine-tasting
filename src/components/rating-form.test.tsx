// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ActionState } from '@/lib/action-state'
import { RatingForm } from './rating-form'

beforeEach(() => {
  // jsdom has neither scrollIntoView nor matchMedia
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never
})

const criteria = [
  { id: 'a', name: 'Geruch', scaleMin: 1, scaleMax: 5 },
  { id: 'b', name: 'Geschmack', scaleMin: 1, scaleMax: 5 },
]

// The server answers like parseRatingForm: names the missing criteria
const failing = vi.fn(
  async (): Promise<ActionState> => ({
    fieldErrors: { c_a: ['Bitte vergib Sterne.'], c_b: ['Bitte vergib Sterne.'] },
    message: 'Bei Geruch und Geschmack fehlen noch Sterne.',
  }),
)

function renderForm(initialValues: Record<string, number> = {}) {
  render(<RatingForm action={failing} criteria={criteria} initialValues={initialValues} initialNotes="" isLast={false} />)
}

it('labels the notes as optional and says who sees them', () => {
  renderForm()
  expect(screen.getByLabelText('Was schmeckst du? (freiwillig)')).toHaveAccessibleDescription(
    'Wird am Ende ohne deinen Namen allen gezeigt.',
  )
})

it('after a failed save: shows the message, marks "fehlt" and focuses the first row without stars', async () => {
  renderForm()
  await userEvent.click(screen.getByRole('button', { name: 'Speichern & weiter' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Bei Geruch und Geschmack fehlen noch Sterne.')
  expect(screen.getAllByText('fehlt')).toHaveLength(2)
  const first = screen.getByRole('radiogroup', { name: 'Geruch' })
  expect(first.querySelector('[role="radio"]')).toHaveFocus()
})

it('skips rows that already have stars and drops "fehlt" as soon as one is set', async () => {
  failing.mockResolvedValueOnce({
    fieldErrors: { c_b: ['Bitte vergib Sterne.'] },
    message: 'Bei Geschmack fehlen noch Sterne.',
  })
  renderForm({ a: 4 })
  await userEvent.click(screen.getByRole('button', { name: 'Speichern & weiter' }))

  expect(await screen.findByRole('alert')).toHaveTextContent('Bei Geschmack fehlen noch Sterne.')
  expect(screen.getAllByText('fehlt')).toHaveLength(1)
  expect(screen.getByRole('radiogroup', { name: 'Geschmack' }).querySelector('[role="radio"]')).toHaveFocus()

  await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Geschmack' })).getByRole('radio', { name: '2 von 5 Sternen' }))
  expect(screen.queryByText('fehlt')).not.toBeInTheDocument()
})
