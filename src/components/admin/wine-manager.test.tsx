// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const shuffleWinesAction = vi.fn()
vi.mock('@/app/tasting/[code]/admin/actions', () => ({
  addWineAction: vi.fn(),
  deleteWineAction: vi.fn(),
  moveWineAction: vi.fn(),
  updateWineAction: vi.fn(),
  shuffleWinesAction: (...args: unknown[]) => shuffleWinesAction(...args),
}))

import { WineManager } from './wine-manager'

const wines = [1, 2, 3].map((n) => ({ id: `id-${n}`, position: n, name: `Wein ${n}` }) as never)

const setup = (status: 'setup' | 'active' | 'finished', unratedCount: number) =>
  render(
    <WineManager code="ABC123" wines={wines} locked={status !== 'setup'} status={status} unratedCount={unratedCount} />,
  )

it('offers shuffling in setup without the running hint', () => {
  setup('setup', 3)
  expect(screen.getByRole('button', { name: 'Reihenfolge mischen' })).toBeEnabled()
  expect(screen.queryByText(/noch niemand bewertet/)).toBeNull()
})

it('shows the margin note while the tasting runs', () => {
  setup('active', 3)
  expect(screen.getByText(/noch niemand bewertet/)).toBeInTheDocument()
})

it('disables the button with a reason when fewer than two wines are unrated', () => {
  setup('active', 1)
  const button = screen.getByRole('button', { name: 'Reihenfolge mischen' })
  expect(button).toBeDisabled()
  expect(button).toHaveAccessibleDescription(/mindestens zwei Weine/)
})

it('hides the control once finished', () => {
  setup('finished', 3)
  expect(screen.queryByRole('button', { name: 'Reihenfolge mischen' })).toBeNull()
})

it('announces the result and marks refusals as errors', async () => {
  shuffleWinesAction.mockResolvedValueOnce({ ok: true, message: 'Reihenfolge von 3 Weinen neu gemischt.' })
  setup('setup', 3)
  await userEvent.click(screen.getByRole('button', { name: 'Reihenfolge mischen' }))
  expect(await screen.findByText('Reihenfolge von 3 Weinen neu gemischt.')).toHaveClass('text-muted-foreground')
  shuffleWinesAction.mockResolvedValueOnce({ message: 'Zu wenige.' })
  await userEvent.click(screen.getByRole('button', { name: 'Reihenfolge mischen' }))
  expect(await screen.findByText('Zu wenige.')).toHaveClass('text-destructive')
})

it('explains what shuffling is for', () => {
  setup('setup', 3)
  expect(screen.getByText(/Für Blindverkostungen: würfelt die Nummern/)).toBeInTheDocument()
})

it('shows the lock hint with an info popover about wrongly poured wines while the tasting runs', async () => {
  setup('active', 3)
  expect(screen.getByText(/Umsortieren geht weiter, Löschen nur in der Vorbereitung/)).toBeInTheDocument()
  expect(screen.queryByText(/Glas 2 war in Wahrheit Wein 3/)).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Umsortieren oder falsch eingeschenkt?' }))
  expect(screen.getByText(/Glas 2 war in Wahrheit Wein 3/)).toBeInTheDocument()
})

it('has no lock hint or info button in setup', () => {
  setup('setup', 3)
  expect(screen.queryByRole('button', { name: 'Umsortieren oder falsch eingeschenkt?' })).toBeNull()
})

it('marks name and wine type as required in the add form, with one legend', () => {
  render(<WineManager code="ABC123" wines={[]} locked={false} status="setup" unratedCount={0} />)
  expect(screen.getAllByText('Pflichtfeld')).toHaveLength(1)
  for (const name of ['Name', 'Weinart']) {
    const field = screen.getByRole(name === 'Name' ? 'textbox' : 'combobox', { name })
    expect(field).toBeRequired()
    expect(field).toHaveAttribute('aria-required', 'true')
  }
  // The winery field has a suggestion list, so it is a combobox
  expect(screen.getByRole('combobox', { name: 'Weingut' })).not.toBeRequired()
  for (const name of ['Jahrgang', 'Rebsorte', 'Beschreibung']) {
    expect(screen.getByRole('textbox', { name })).not.toBeRequired()
  }
  expect(screen.getByRole('combobox', { name: 'Geschmacksrichtung' })).not.toBeRequired()
  // The asterisk is decoration: the label's accessible name stays plain
  const stars = document.querySelectorAll('label [data-slot="required-mark"]')
  expect(stars).toHaveLength(2)
  for (const star of stars) {
    expect(star).toHaveAttribute('aria-hidden', 'true')
    expect(star.closest('label')).toHaveTextContent(/^(Name|Weinart)$/)
  }
})

it('orders the fields Name, Weinart, Weingut, Jahrgang, Alkohol, Rebsorte, Geschmacksrichtung, Beschreibung', () => {
  render(<WineManager code="ABC123" wines={[]} locked={false} status="setup" unratedCount={0} />)
  const form = screen.getByRole('button', { name: 'Wein hinzufügen' }).closest('form')!
  const names = [...form.querySelectorAll('[name]')].map((el) => el.getAttribute('name'))
  expect(names).toEqual(['name', 'wineType', 'winery', 'vintage', 'alcohol', 'grapeVariety', 'sweetness', 'description'])
})

it('asks for a wine type with a placeholder instead of "keine Angabe"', () => {
  render(<WineManager code="ABC123" wines={[]} locked={false} status="setup" unratedCount={0} />)
  const wineType = screen.getByRole('combobox', { name: 'Weinart' })
  expect(wineType).toHaveValue('')
  expect(within(wineType).getByRole('option', { name: 'Bitte wählen' })).toBeInTheDocument()
  expect(within(wineType).queryByRole('option', { name: 'keine Angabe' })).toBeNull()
  expect(within(screen.getByRole('combobox', { name: 'Geschmacksrichtung' })).getByRole('option', { name: 'keine Angabe' })).toBeInTheDocument()
})

it('shows the winery in the list and prefills it when editing; old wines without type must pick one', async () => {
  const wine = {
    id: 'id-1', position: 1, name: 'Kabinett', winery: 'Dr. Loosen', vintage: 2022, grapeVariety: null, sweetness: null, wineType: null,
    description: null,
    alcohol: null,
  }
  render(<WineManager code="ABC123" wines={[wine]} locked={false} status="setup" unratedCount={1} />)
  expect(screen.getByText('Dr. Loosen · 2022')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Wein #1 bearbeiten' }))
  const form = screen.getByRole('button', { name: 'Speichern' }).closest('form')!
  expect(within(form).getByRole('combobox', { name: 'Weingut' })).toHaveValue('Dr. Loosen')
  expect(within(form).getByRole('combobox', { name: 'Weinart' })).toHaveValue('')
  expect(within(form).getByText('Pflichtfeld')).toBeInTheDocument()
})

it('offers an optional description with an example, shows it in the list and prefills it when editing', async () => {
  const wine = {
    id: 'id-1', position: 1, name: 'Innamorati', winery: null, vintage: null, grapeVariety: null, sweetness: 'sweet' as const,
    wineType: 'white' as const, description: 'Süß & fruchtig', alcohol: null,
  }
  render(<WineManager code="ABC123" wines={[wine]} locked={false} status="setup" unratedCount={1} />)
  const add = screen.getByRole('button', { name: 'Wein hinzufügen' }).closest('form')!
  const field = within(add).getByRole('textbox', { name: 'Beschreibung' })
  expect(field).toHaveAttribute('placeholder', 'z. B. fruchtig, Noten von Kirsche')
  expect(field).toHaveAttribute('maxLength', '200')
  expect(field).not.toBeRequired()
  // List row: details first, the description on its own line
  expect(screen.getByText('Weißwein · süß')).toBeInTheDocument()
  expect(screen.getByText('Süß & fruchtig')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Wein #1 bearbeiten' }))
  const form = screen.getByRole('button', { name: 'Speichern' }).closest('form')!
  expect(within(form).getByRole('textbox', { name: 'Beschreibung' })).toHaveValue('Süß & fruchtig')
  expect(within(form).getByRole('combobox', { name: 'Geschmacksrichtung' })).toHaveValue('sweet')
})
