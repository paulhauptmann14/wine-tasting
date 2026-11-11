// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it } from 'vitest'
import { InfoPopover } from './info-popover'

it('opens on click and closes on Escape', async () => {
  const user = userEvent.setup()
  render(<InfoPopover label="Was heißt das?">Erklärung</InfoPopover>)
  const trigger = screen.getByRole('button', { name: 'Was heißt das?' })
  expect(screen.queryByText('Erklärung')).toBeNull()
  await user.click(trigger)
  expect(screen.getByText('Erklärung')).toBeInTheDocument()
  await user.keyboard('{Escape}')
  expect(screen.queryByText('Erklärung')).toBeNull()
  expect(trigger).toHaveFocus()
})

it('opens with the keyboard', async () => {
  const user = userEvent.setup()
  render(<InfoPopover label="Was heißt das?">Erklärung</InfoPopover>)
  await user.tab()
  await user.keyboard('{Enter}')
  expect(screen.getByText('Erklärung')).toBeInTheDocument()
})

it('closes on an outside click', async () => {
  const user = userEvent.setup()
  render(
    <div>
      <button type="button">draußen</button>
      <InfoPopover label="Was heißt das?">Erklärung</InfoPopover>
    </div>,
  )
  await user.click(screen.getByRole('button', { name: 'Was heißt das?' }))
  await user.click(screen.getByRole('button', { name: 'draußen' }))
  expect(screen.queryByText('Erklärung')).toBeNull()
})
