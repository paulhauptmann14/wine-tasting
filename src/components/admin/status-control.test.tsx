// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { setStatusAction } from '@/app/tasting/[code]/admin/actions'
import { StatusControl } from './status-control'

vi.mock('@/app/tasting/[code]/admin/actions', () => ({ setStatusAction: vi.fn() }))

type Props = Parameters<typeof StatusControl>[0]
const setup = (props: Partial<Props> = {}) =>
  render(<StatusControl code="8GXBW5" status="active" blindTasting={false} openGuests={0} {...props} />)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(setStatusAction).mockResolvedValue({ ok: true })
})

it('asks before going back to setup and explains what guests see', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(await screen.findByRole('button', { name: 'Zurück in Vorbereitung' }))
  const dialog = screen.getByRole('alertdialog')
  expect(within(dialog).getByText('Zurück in die Vorbereitung?')).toBeInTheDocument()
  expect(
    within(dialog).getByText('Deine Gäste können so lange nicht bewerten. Bisherige Bewertungen bleiben.'),
  ).toBeInTheDocument()
  expect(setStatusAction).not.toHaveBeenCalled()

  await user.click(within(dialog).getByRole('button', { name: 'Zurück in Vorbereitung' }))
  expect(setStatusAction).toHaveBeenCalledOnce()
  const fd = vi.mocked(setStatusAction).mock.calls[0][2] as FormData
  expect(fd.get('to')).toBe('setup')
})

it('does not talk about revealing names when the tasting is not blind', async () => {
  const user = userEvent.setup()
  setup({ blindTasting: false })
  await user.click(await screen.findByRole('button', { name: 'Tasting beenden' }))
  const dialog = screen.getByRole('alertdialog')
  expect(within(dialog).queryByText(/aufgelöst/)).toBeNull()
  expect(within(dialog).getByRole('button', { name: 'Beenden' })).toBeInTheDocument()
})

it('reveals the names when a blind tasting ends', async () => {
  const user = userEvent.setup()
  setup({ blindTasting: true })
  await user.click(await screen.findByRole('button', { name: 'Tasting beenden & auflösen' }))
  const dialog = screen.getByRole('alertdialog')
  expect(within(dialog).getByText(/Weinnamen für alle aufgelöst/)).toBeInTheDocument()
  expect(within(dialog).getByRole('button', { name: 'Beenden & auflösen' })).toBeInTheDocument()
})

it('names the guests who are not done yet in the finish dialog', async () => {
  const user = userEvent.setup()
  setup({ openGuests: 2 })
  await user.click(await screen.findByRole('button', { name: 'Tasting beenden' }))
  expect(within(screen.getByRole('alertdialog')).getByText(/2 Gäste sind noch nicht fertig\./)).toBeInTheDocument()
})

it('stays quiet about unfinished guests when everyone is done', async () => {
  const user = userEvent.setup()
  setup({ openGuests: 0 })
  await user.click(await screen.findByRole('button', { name: 'Tasting beenden' }))
  expect(within(screen.getByRole('alertdialog')).queryByText(/noch nicht fertig/)).toBeNull()
})

it('starts without a dialog during setup', async () => {
  setup({ status: 'setup' })
  expect(screen.getByRole('button', { name: 'Tasting starten' })).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /beenden/i })).toBeNull()
  // The dialog code loads in the background – still nothing to confirm
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(screen.queryByRole('button', { name: /beenden/i })).toBeNull()
})
