// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

let search = ''
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(search) }))

import { TastingDeletedNote } from './tasting-deleted-note'

beforeEach(() => {
  search = ''
  window.history.replaceState(null, '', '/')
})

it('confirms the deletion once and cleans the address', () => {
  search = 'deleted=1'
  window.history.replaceState(null, '', '/?deleted=1')
  render(<TastingDeletedNote />)
  expect(screen.getByRole('status')).toHaveTextContent('Tasting gelöscht.')
  expect(window.location.search).toBe('')
})

it('stays hidden without the parameter', () => {
  render(<TastingDeletedNote />)
  expect(screen.queryByText('Tasting gelöscht.')).toBeNull()
})
