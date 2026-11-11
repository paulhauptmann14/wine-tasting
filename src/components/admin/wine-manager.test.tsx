// @vitest-environment jsdom
import { expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
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
