// @vitest-environment jsdom
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import { RejoinForm } from './rejoin-form'

beforeEach(() => {
  // jsdom has neither scrollIntoView nor matchMedia (used to reveal the error above the bottom bar)
  Element.prototype.scrollIntoView = vi.fn()
  window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as never
})

it('signs in only on the button, and shows why it failed', async () => {
  const action = vi.fn(async () => ({ message: 'Dieser Link gilt nicht mehr. Frag den Gastgeber nach einem neuen.' }))
  render(<RejoinForm action={action} name="Anna" />)
  expect(action).not.toHaveBeenCalled()

  await userEvent.click(screen.getByRole('button', { name: 'Als Anna weitermachen' }))
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Dieser Link gilt nicht mehr.'))
  expect(action).toHaveBeenCalledTimes(1)
})
