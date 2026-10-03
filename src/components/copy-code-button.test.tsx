// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { CopyCodeButton } from './copy-code-button'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

it('copies the code and confirms it briefly', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  render(<CopyCodeButton code="8GXBW5" />)

  await user.click(screen.getByRole('button', { name: 'Code kopieren' }))
  expect(writeText).toHaveBeenCalledWith('8GXBW5')
  expect(await navigator.clipboard.readText()).toBe('8GXBW5')
  expect(screen.getByRole('button', { name: 'Code kopiert' })).toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('Code kopiert')
})

it('resets the confirmation after two seconds', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  render(<CopyCodeButton code="8GXBW5" />)

  await user.click(screen.getByRole('button', { name: 'Code kopieren' }))
  await act(() => vi.advanceTimersByTimeAsync(2100))
  expect(screen.getByRole('button', { name: 'Code kopieren' })).toBeInTheDocument()
})
