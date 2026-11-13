// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { goToTastingAction } from '@/app/actions'
import { manageLoginAction } from '@/app/manage/actions'
import { deleteTastingAction } from '@/app/tasting/[code]/admin/actions'
import { DeleteTasting } from '@/components/admin/delete-tasting'
import { describedBy, FieldError } from './field-error'
import { JoinByCodeForm } from './join-by-code-form'
import { JoinForm } from './join-form'
import { ManageLoginForm } from './manage-login-form'

vi.mock('@/app/actions', () => ({ goToTastingAction: vi.fn() }))
vi.mock('@/app/manage/actions', () => ({ manageLoginAction: vi.fn() }))
vi.mock('@/app/tasting/[code]/admin/actions', () => ({ deleteTastingAction: vi.fn() }))

beforeEach(() => {
  vi.clearAllMocks()
  // useRevealErrors scrolls to the first invalid field; jsdom has neither scrollIntoView nor matchMedia
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never
})

it('lists the error first, then the other ids, and nothing when there is nothing', () => {
  expect(describedBy('pin', ['Falsch'], 'pin-hint')).toBe('pin-error pin-hint')
  expect(describedBy('pin', undefined, 'pin-hint')).toBe('pin-hint')
  expect(describedBy('pin', [], false, undefined)).toBeUndefined()
  expect(describedBy('name', ['Fehlt'], null, 'name-scan')).toBe('name-error name-scan')
})

it('renders the first error with the id the field points at', () => {
  render(<FieldError fieldId="pin" errors={['Erster', 'Zweiter']} />)
  expect(screen.getByText('Erster')).toHaveAttribute('id', 'pin-error')
  expect(screen.queryByText('Zweiter')).toBeNull()
})

it('links the name error when joining', async () => {
  const action = vi.fn(async () => ({ fieldErrors: { name: ['Bitte gib deinen Namen ein.'] } }))
  const user = userEvent.setup()
  render(<JoinForm action={action} />)
  await user.click(screen.getByRole('button', { name: 'Beitreten' }))
  await screen.findByText('Bitte gib deinen Namen ein.')
  expect(screen.getByRole('textbox', { name: 'Wie heißt du?' })).toHaveAccessibleDescription(
    'Bitte gib deinen Namen ein.',
  )
})

it('links the code error on the start page', async () => {
  vi.mocked(goToTastingAction).mockResolvedValue({ fieldErrors: { code: ['Diesen Code gibt es nicht.'] } })
  const user = userEvent.setup()
  render(<JoinByCodeForm />)
  await user.type(screen.getByRole('textbox', { name: 'Code vom Gastgeber' }), 'ABCDEF')
  await user.keyboard('{Enter}')
  await screen.findByText('Diesen Code gibt es nicht.')
  expect(screen.getByRole('textbox', { name: 'Code vom Gastgeber' })).toHaveAccessibleDescription(
    'Diesen Code gibt es nicht.',
  )
})

it('links code and PIN errors when logging in to manage, keeping the PIN hint', async () => {
  vi.mocked(manageLoginAction).mockResolvedValue({
    fieldErrors: { code: ['Bitte gib den Code ein.'], pin: ['Bitte gib deine PIN ein.'] },
  })
  const user = userEvent.setup()
  render(<ManageLoginForm />)
  await user.click(screen.getByRole('button', { name: 'Weiter' }))
  await screen.findByText('Bitte gib den Code ein.')
  expect(screen.getByLabelText('Code')).toHaveAccessibleDescription('Bitte gib den Code ein.')
  const pin = screen.getByLabelText('PIN')
  expect(pin).toHaveAccessibleDescription(expect.stringMatching(/^Bitte gib deine PIN ein\. PIN vergessen\?/))
})

it('links the confirmation error when deleting a tasting', async () => {
  vi.mocked(deleteTastingAction).mockResolvedValue({ fieldErrors: { confirm: ['Der Code passt nicht.'] } })
  const user = userEvent.setup()
  render(<DeleteTasting code="ABC123" />)
  const field = screen.getByRole('textbox', { name: /Zur Bestätigung/ })
  await user.type(field, 'ABC123')
  await user.click(screen.getByRole('button', { name: 'Endgültig löschen' }))
  await screen.findByText('Der Code passt nicht.')
  expect(field).toHaveAccessibleDescription('Der Code passt nicht.')
})
