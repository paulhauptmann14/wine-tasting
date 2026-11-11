// @vitest-environment jsdom
import { expect, it } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StarRating } from './star-rating'

function Harness() {
  const [value, setValue] = useState<number | null>(null)
  return (
    <form data-testid="form">
      <StarRating name="c_1" label="Aroma" value={value} onChange={setValue} />
    </form>
  )
}

const formValue = () => new FormData(screen.getByTestId('form') as HTMLFormElement).get('c_1')

it('selects a value by click and exposes it to the form', async () => {
  render(<Harness />)
  expect(screen.getByRole('radiogroup', { name: 'Aroma' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('radio', { name: '4 von 5 Sternen' }))
  expect(screen.getByRole('radio', { name: '4 von 5 Sternen' })).toHaveAttribute('aria-checked', 'true')
  expect(formValue()).toBe('4')
})

it('supports arrow keys', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('radio', { name: '2 von 5 Sternen' }))
  await userEvent.keyboard('{ArrowRight}{ArrowRight}')
  expect(formValue()).toBe('4')
  await userEvent.keyboard('{ArrowLeft}')
  expect(formValue()).toBe('3')
  await userEvent.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}')
  expect(formValue()).toBe('5')
})

it('names the chosen step below the criterion', async () => {
  render(<Harness />)
  await userEvent.click(screen.getByRole('radio', { name: '4 von 5 Sternen' }))
  expect(screen.getByRole('radiogroup', { name: 'Aroma' })).toHaveAccessibleDescription('sehr gut')
  await userEvent.click(screen.getByRole('radio', { name: '1 von 5 Sternen' }))
  expect(screen.getByText('schwach')).toBeVisible()
})
