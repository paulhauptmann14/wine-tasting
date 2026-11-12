// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { WineryInput } from './winery-input'

const names = ['Weingut Dr. Loosen', 'Weingut Josef Loosen', 'Weingut Egon Müller', 'Loosen Bros 1', 'Loosen Bros 2', 'Loosen Bros 3', 'Loosen Bros 4']
const fetchMock = vi.fn(async () => ({ ok: true, json: async () => names }))
vi.stubGlobal('fetch', fetchMock)

afterEach(() => fetchMock.mockClear())

const options = (c: HTMLElement) => [...c.querySelectorAll('datalist option')].map((o) => o.getAttribute('value'))

it('keeps name, default value and aria attributes of a plain input', () => {
  render(<WineryInput name="winery" defaultValue="Hof A" aria-invalid maxLength={80} />)
  const input = screen.getByRole('combobox')
  expect(input).toHaveAttribute('name', 'winery')
  expect(input).toHaveValue('Hof A')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAttribute('maxlength', '80')
})

it('loads the list on first focus only and suggests at most six', async () => {
  const user = userEvent.setup()
  const { container } = render(<WineryInput name="winery" />)
  expect(fetchMock).not.toHaveBeenCalled()
  const input = screen.getByRole('combobox')
  await user.click(input)
  await user.type(input, 'loosen')
  await waitFor(() => expect(options(container).length).toBe(6))
  expect(options(container)).toContain('Weingut Dr. Loosen')
  expect(options(container)).not.toContain('Weingut Egon Müller')
  expect(fetchMock.mock.calls.length).toBeLessThanOrEqual(1)
})

it('allows free text and reports changes', async () => {
  const user = userEvent.setup()
  const onValueChange = vi.fn()
  render(<WineryInput name="winery" onValueChange={onValueChange} />)
  await user.type(screen.getByRole('combobox'), 'Hof Xyz')
  expect(screen.getByRole('combobox')).toHaveValue('Hof Xyz')
  expect(onValueChange).toHaveBeenLastCalledWith('Hof Xyz')
})

it('follows a controlled value', () => {
  const { rerender } = render(<WineryInput name="winery" value="A" />)
  rerender(<WineryInput name="winery" value="Weingut Dr. Loosen" />)
  expect(screen.getByRole('combobox')).toHaveValue('Weingut Dr. Loosen')
})
