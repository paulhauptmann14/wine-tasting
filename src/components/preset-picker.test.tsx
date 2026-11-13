// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PresetPicker } from './preset-picker'

it('marks the recommended system', () => {
  render(<PresetPicker defaultValue="five" recommended="five" />)
  expect(screen.getByRole('radio', { name: /5-Punkte-Schema.*Empfohlen/ })).toBeChecked()
  expect(screen.getAllByText('Empfohlen')).toHaveLength(1)
})

it('shows no recommendation unless asked to', () => {
  render(<PresetPicker defaultValue="five" />)
  expect(screen.queryByText('Empfohlen')).toBeNull()
})

it('shows a check mark on the selected card only', async () => {
  const user = userEvent.setup()
  const { container } = render(<PresetPicker defaultValue="five" />)
  const checks = () => container.querySelectorAll('[data-slot="preset-check"]')
  expect(checks()).toHaveLength(1)
  expect(checks()[0].closest('label')).toHaveTextContent('5-Punkte-Schema')
  await user.click(screen.getByText('100-Punkte-Schema', { exact: true }))
  expect(checks()).toHaveLength(1)
  expect(checks()[0].closest('label')).toHaveTextContent('100-Punkte-Schema')
})

it('collapses the scoring explanation into a details element when asked', () => {
  const { container } = render(<PresetPicker defaultValue="five" collapseExplainer />)
  const details = container.querySelector('details')
  expect(details).not.toBeNull()
  expect(details).not.toHaveAttribute('open')
  expect(screen.getByText('So wird gerechnet', { selector: 'summary *, summary' })).toBeInTheDocument()
})

it('keeps the scoring explanation open by default', () => {
  const { container } = render(<PresetPicker defaultValue="five" />)
  expect(container.querySelector('details')).toBeNull()
  expect(screen.getByText('So wird gerechnet')).toBeInTheDocument()
})

it('links its error text to the group', () => {
  render(<PresetPicker legend="Bewertungssystem" errors={['Bitte wähl ein Bewertungssystem.']} />)
  expect(screen.getByRole('group', { name: 'Bewertungssystem' })).toHaveAccessibleDescription(
    'Bitte wähl ein Bewertungssystem.',
  )
})
