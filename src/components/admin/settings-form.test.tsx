// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { updateSettingsAction } from '@/app/tasting/[code]/admin/actions'
import { SettingsForm } from './settings-form'

vi.mock('@/app/tasting/[code]/admin/actions', () => ({
  updateSettingsAction: vi.fn(),
  updateBlindTastingAction: vi.fn(),
}))

// Radix Switch measures itself; jsdom has no ResizeObserver
vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} })

const setup = () =>
  render(<SettingsForm code="ABC123" name="Weinabend" description={null} blindTasting={false} blindLocked={false} />)

beforeEach(() => vi.clearAllMocks())

it('announces "Gespeichert." in a live region that is there before saving', async () => {
  vi.mocked(updateSettingsAction).mockResolvedValue({ ok: true, message: 'Gespeichert.' })
  const user = userEvent.setup()
  const { container } = setup()
  const form = screen.getByRole('button', { name: 'Speichern' }).closest('form')!
  const region = form.querySelector('[aria-live="polite"]')
  expect(region).toBeInTheDocument()
  expect(region).toBeEmptyDOMElement()
  await user.click(screen.getByRole('button', { name: 'Speichern' }))
  expect(await screen.findByText('Gespeichert.')).toBe(region)
  expect(container.contains(region)).toBe(true)
})

it('empties the live region while saving again, so the second save is announced too', async () => {
  vi.mocked(updateSettingsAction).mockResolvedValueOnce({ ok: true, message: 'Gespeichert.' })
  const user = userEvent.setup()
  setup()
  const button = screen.getByRole('button', { name: 'Speichern' })
  const region = button.closest('form')!.querySelector('[aria-live="polite"]')
  await user.click(button)
  await waitFor(() => expect(region).toHaveTextContent('Gespeichert.'))
  let finish!: () => void
  vi.mocked(updateSettingsAction).mockImplementationOnce(
    () => new Promise((resolve) => (finish = () => resolve({ ok: true, message: 'Gespeichert.' }))),
  )
  await user.click(button)
  await waitFor(() => expect(region).toBeEmptyDOMElement())
  await act(async () => finish())
  await waitFor(() => expect(region).toHaveTextContent('Gespeichert.'))
})

it('links the error texts to name and description, keeping the hint', async () => {
  vi.mocked(updateSettingsAction).mockResolvedValue({
    fieldErrors: { name: ['Bitte gib einen Namen ein.'], description: ['Höchstens 300 Zeichen.'] },
  })
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Speichern' }))
  await screen.findByText('Bitte gib einen Namen ein.')
  expect(screen.getByRole('textbox', { name: 'Name der Verkostung' })).toHaveAccessibleDescription(
    'Bitte gib einen Namen ein.',
  )
  expect(screen.getByRole('textbox', { name: 'Beschreibung' })).toHaveAccessibleDescription(
    expect.stringMatching(/^Höchstens 300 Zeichen\. Optional\./),
  )
  expect(screen.queryByText('Gespeichert.')).toBeNull()
})
