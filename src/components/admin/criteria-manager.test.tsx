// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { addCriterionAction, renameCriterionAction } from '@/app/tasting/[code]/admin/actions'
import { CriteriaManager } from './criteria-manager'

vi.mock('@/app/tasting/[code]/admin/actions', () => ({
  addCriterionAction: vi.fn(),
  deleteCriterionAction: vi.fn(),
  moveCriterionAction: vi.fn(),
  renameCriterionAction: vi.fn(),
}))

const criteria = [
  { id: 'c1', name: 'Farbe', position: 1 },
  { id: 'c2', name: 'Geruch', position: 2 },
]
const setup = (locked = false) => render(<CriteriaManager code="8GXBW5" criteria={criteria} locked={locked} />)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(addCriterionAction).mockResolvedValue({ ok: true })
  vi.mocked(renameCriterionAction).mockResolvedValue({ ok: true })
})

it('focuses the name field when renaming opens', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Farbe umbenennen' }))
  expect(screen.getByLabelText('Neuer Name')).toHaveFocus()
})

it('confirms an added criterion right at the add form', async () => {
  const user = userEvent.setup()
  setup()
  await user.type(screen.getByLabelText('Kriterium hinzufügen'), 'Preis-Leistung')
  await user.click(screen.getByRole('button', { name: 'Hinzufügen' }))
  expect(await screen.findByText('„Preis-Leistung“ hinzugefügt.')).toBeInTheDocument()
})

it('drops the confirmation once the host types the next name', async () => {
  const user = userEvent.setup()
  setup()
  await user.type(screen.getByLabelText('Kriterium hinzufügen'), 'Abgang')
  await user.click(screen.getByRole('button', { name: 'Hinzufügen' }))
  await screen.findByText('„Abgang“ hinzugefügt.')
  await user.type(screen.getByLabelText('Kriterium hinzufügen'), 'K')
  expect(screen.queryByText('„Abgang“ hinzugefügt.')).toBeNull()
})

it('shows no confirmation when adding fails', async () => {
  vi.mocked(addCriterionAction).mockResolvedValueOnce({ fieldErrors: { name: ['Bitte gib einen Namen ein.'] } })
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Hinzufügen' }))
  expect(await screen.findByText('Bitte gib einen Namen ein.')).toBeInTheDocument()
  expect(screen.queryByText(/hinzugefügt\./)).toBeNull()
})
