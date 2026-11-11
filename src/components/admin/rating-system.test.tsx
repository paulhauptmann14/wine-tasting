// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { applyPresetAction } from '@/app/tasting/[code]/admin/actions'
import { PRESETS } from '@/lib/tasting/presets'
import { RatingSystem } from './rating-system'

vi.mock('@/app/tasting/[code]/admin/actions', () => ({ applyPresetAction: vi.fn() }))

const rows = (key: keyof typeof PRESETS) => PRESETS[key].criteria.map((c) => ({ ...c }))
const setup = (props: Partial<Parameters<typeof RatingSystem>[0]> = {}) =>
  render(<RatingSystem code="8GXBW5" scale="five" criteria={rows('five')} locked={false} hasRatings={false} {...props} />)

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(applyPresetAction).mockResolvedValue({ ok: true })
})

it('names the current system and offers to change it', () => {
  setup()
  expect(screen.getByText('Bewertungssystem:')).toBeInTheDocument()
  expect(screen.getByText('5-Punkte-Schema')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ändern' })).toBeInTheDocument()
})

it('shows customized criteria with their scale', () => {
  setup({ criteria: [{ name: 'Nase', weight: 1 }] })
  expect(screen.getByText('Eigene Kriterien (5-Punkte-Skala)')).toBeInTheDocument()
})

it('is read-only once the tasting runs', () => {
  setup({ locked: true })
  expect(screen.getByText('5-Punkte-Schema')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Ändern' })).not.toBeInTheDocument()
})

it('explains why it is read-only when ratings exist', () => {
  setup({ hasRatings: true })
  expect(screen.queryByRole('button', { name: 'Ändern' })).not.toBeInTheDocument()
  expect(screen.getByText(/Es gibt schon Bewertungen/)).toBeInTheDocument()
})

it('previews the chosen system and only enables "System übernehmen" for a different one', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Ändern' }))
  const apply = screen.getByRole('button', { name: 'System übernehmen' })
  expect(apply).toBeDisabled()
  expect(screen.getByRole('radio', { name: /5-Punkte-Schema/ })).toBeChecked()

  await user.click(screen.getByRole('radio', { name: /100-Punkte-Schema/ }))
  expect(apply).toBeEnabled()
  expect(screen.getByText(/Überall 4 Sterne ergeben 90/)).toBeInTheDocument()
})

it('asks for confirmation, then applies the chosen preset and closes', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Ändern' }))
  await user.click(screen.getByRole('radio', { name: /100-Punkte-Schema/ }))
  await user.click(screen.getByRole('button', { name: 'System übernehmen' }))

  const dialog = await screen.findByRole('alertdialog')
  expect(within(dialog).getByText('Deine Kriterien werden durch die des neuen Systems ersetzt.')).toBeInTheDocument()
  expect(applyPresetAction).not.toHaveBeenCalled()

  await user.click(within(dialog).getByRole('button', { name: 'Kriterien ersetzen' }))
  expect(applyPresetAction).toHaveBeenCalledTimes(1)
  const fd = vi.mocked(applyPresetAction).mock.calls[0][2] as FormData
  expect(vi.mocked(applyPresetAction).mock.calls[0][0]).toBe('8GXBW5')
  expect(fd.get('preset')).toBe('hundred')

  expect(await screen.findByText('Bewertungssystem geändert.')).toBeInTheDocument()
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
})

it('does not apply anything when the confirmation is cancelled', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Ändern' }))
  await user.click(screen.getByRole('radio', { name: /Einfach/ }))
  await user.click(screen.getByRole('button', { name: 'System übernehmen' }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Abbrechen' }))
  expect(applyPresetAction).not.toHaveBeenCalled()
  expect(screen.getAllByRole('radio')).toHaveLength(4)
})

it('returns the focus to "System übernehmen" when the confirmation is cancelled', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Ändern' }))
  await user.click(screen.getByRole('radio', { name: /100-Punkte-Schema/ }))
  await user.click(screen.getByRole('button', { name: 'System übernehmen' }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Abbrechen' }))
  expect(screen.getByRole('button', { name: 'System übernehmen' })).toHaveFocus()
})

it('moves the focus into the picker when it opens and hides the rest of the page', async () => {
  const user = userEvent.setup()
  render(
    <RatingSystem code="8GXBW5" scale="five" criteria={rows('five')} locked={false} hasRatings={false}>
      <p>Kriterienliste</p>
    </RatingSystem>,
  )
  expect(screen.getByText('Kriterienliste')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Ändern' }))
  expect(screen.getByRole('radio', { name: /5-Punkte-Schema/ })).toHaveFocus()
  expect(screen.getByText('Kriterienliste').parentElement).toHaveClass('hidden')
})

it('keeps the picker open and shows the reason when the server refuses', async () => {
  vi.mocked(applyPresetAction).mockResolvedValue({ message: 'Es gibt schon Bewertungen.' })
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Ändern' }))
  await user.click(screen.getByRole('radio', { name: /20-Punkte-Schema/ }))
  await user.click(screen.getByRole('button', { name: 'System übernehmen' }))
  await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Kriterien ersetzen' }))
  expect(await screen.findByText('Es gibt schon Bewertungen.')).toBeInTheDocument()
  expect(screen.getAllByRole('radio')).toHaveLength(4)
})

it('closes with "Abbrechen" and returns the focus to "Ändern"', async () => {
  const user = userEvent.setup()
  setup()
  await user.click(screen.getByRole('button', { name: 'Ändern' }))
  await user.click(screen.getByRole('button', { name: 'Abbrechen' }))
  expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ändern' })).toHaveFocus()
})

it('starts without a selection when the criteria were customized', async () => {
  const user = userEvent.setup()
  setup({ criteria: [{ name: 'Nase', weight: 1 }] })
  await user.click(screen.getByRole('button', { name: 'Ändern' }))
  for (const radio of screen.getAllByRole('radio')) expect(radio).not.toBeChecked()
  expect(screen.getByRole('button', { name: 'System übernehmen' })).toBeDisabled()
  await user.click(screen.getByRole('radio', { name: /Einfach/ }))
  expect(screen.getByRole('button', { name: 'System übernehmen' })).toBeEnabled()
})
