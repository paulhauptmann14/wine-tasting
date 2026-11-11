// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeToggle } from './theme-toggle'

function mockSystemDark(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query.includes('dark'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }))
}

beforeEach(() => {
  delete document.documentElement.dataset.theme
  document.cookie = 'wt_theme=; path=/; max-age=0'
})

it('switches from system light to dark and remembers the choice', async () => {
  mockSystemDark(false)
  render(<ThemeToggle />)
  await userEvent.click(screen.getByRole('button', { name: 'Dunkles Design' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(document.cookie).toContain('wt_theme=dark')
  expect(screen.getByRole('button', { name: 'Helles Design' })).toBeInTheDocument()
})

it('starts from the saved choice and switches back to light', async () => {
  mockSystemDark(false)
  render(<ThemeToggle initial="dark" />)
  await userEvent.click(screen.getByRole('button', { name: 'Helles Design' }))
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(document.cookie).toContain('wt_theme=light')
})

it('follows a dark system setting when nothing is saved', () => {
  mockSystemDark(true)
  render(<ThemeToggle />)
  expect(screen.getByRole('button', { name: 'Helles Design' })).toBeInTheDocument()
})

it('retints the browser bars to match the chosen theme', async () => {
  mockSystemDark(false)
  document.head.innerHTML =
    '<meta name="theme-color" media="(prefers-color-scheme: light)" content="#f2f2f7">' +
    '<meta name="theme-color" media="(prefers-color-scheme: dark)" content="#000000">' +
    '<meta name="color-scheme" content="light dark">'
  render(<ThemeToggle />)
  await userEvent.click(screen.getByRole('button', { name: 'Dunkles Design' }))
  const metas = [...document.querySelectorAll('meta[name="theme-color"]')]
  expect(metas.map((m) => [m.getAttribute('media'), m.getAttribute('content')])).toEqual([
    [null, '#000000'],
    [null, '#000000'],
  ])
  expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute('content')).toBe('dark')
})
