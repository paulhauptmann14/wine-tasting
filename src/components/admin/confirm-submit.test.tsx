// @vitest-environment jsdom
import { useActionState } from 'react'
import { expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmSubmit } from './confirm-submit'

const props = {
  trigger: 'Wein löschen',
  title: 'Wein #2 löschen?',
  description: 'Alle Bewertungen dieses Weins gehen verloren.',
  confirmLabel: 'Löschen',
  hiddenFields: { id: 'w2' },
}

it('cannot be confirmed twice while a slow server action runs', async () => {
  let finish!: () => void
  const action = vi.fn((fd: FormData) => {
    void fd
    return new Promise<void>((resolve) => {
      finish = resolve
    })
  })
  const user = userEvent.setup()
  render(<ConfirmSubmit action={action} {...props} />)
  await user.click(screen.getByRole('button', { name: 'Wein löschen' }))
  const dialog = screen.getByRole('alertdialog')
  await user.click(within(dialog).getByRole('button', { name: 'Löschen' }))
  expect(action).toHaveBeenCalledOnce()
  expect((action.mock.calls[0][0] as FormData).get('id')).toBe('w2')

  // Still running: the confirm button says so and stays disabled
  const busy = within(dialog).getByRole('button', { name: 'Einen Moment …' })
  expect(busy).toBeDisabled()
  await user.click(busy)
  expect(action).toHaveBeenCalledOnce()

  await act(async () => finish())
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
})

it('also stays open and locked while a useActionState dispatch runs (like StatusControl)', async () => {
  let finish!: () => void
  const slow = vi.fn(
    (_prev: number, fd: FormData) =>
      new Promise<number>((resolve) => {
        void fd
        finish = () => resolve(1)
      }),
  )
  function Host() {
    const [, dispatch] = useActionState(slow, 0)
    return <ConfirmSubmit action={dispatch} {...props} />
  }
  const user = userEvent.setup()
  render(<Host />)
  await user.click(screen.getByRole('button', { name: 'Wein löschen' }))
  const dialog = screen.getByRole('alertdialog')
  await user.click(within(dialog).getByRole('button', { name: 'Löschen' }))
  expect(within(dialog).getByRole('button', { name: 'Einen Moment …' })).toBeDisabled()
  await user.click(within(dialog).getByRole('button', { name: 'Einen Moment …' }))
  expect(slow).toHaveBeenCalledOnce()
  await act(async () => finish())
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
})

it('can name what is happening while it runs', async () => {
  let finish!: () => void
  // Resolved at the end: a never-settling action would stay entangled with later tests' transitions
  const action = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
  const user = userEvent.setup()
  render(<ConfirmSubmit action={action} {...props} pendingLabel="Wird gelöscht …" />)
  await user.click(screen.getByRole('button', { name: 'Wein löschen' }))
  await user.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Löschen' }))
  expect(within(screen.getByRole('alertdialog')).getByRole('button', { name: 'Wird gelöscht …' })).toBeDisabled()
  await act(async () => finish())
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
})
