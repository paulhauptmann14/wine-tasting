// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RejoinLink } from './rejoin-link'

const URL_1 = 'http://localhost:3000/tasting/8GXBW5/rejoin/abc.def'
const URL_2 = 'http://localhost:3000/tasting/8GXBW5/rejoin/abc.ghi'

function stubShare(share?: (data: ShareData) => Promise<void>) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true })
}

afterEach(() => {
  vi.restoreAllMocks()
  stubShare(undefined)
})

function renderLink(url = URL_1) {
  const lockAction = vi.fn(async () => {})
  const view = render(<RejoinLink name="Anna" tastingName="Weinabend bei Paul" url={url} lockAction={lockAction} />)
  const rerender = (next: string) =>
    view.rerender(<RejoinLink name="Anna" tastingName="Weinabend bei Paul" url={next} lockAction={lockAction} />)
  return { lockAction, rerender }
}

const toggle = () => screen.getByRole('button', { name: 'Rückkehr-Link für Anna' })

it('opens and closes the panel with the link', async () => {
  const user = userEvent.setup()
  renderLink()
  const button = toggle()
  const panel = document.getElementById(button.getAttribute('aria-controls')!)!

  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(panel).not.toBeVisible()

  await user.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'true')
  expect(panel).toBeVisible()
  expect(screen.getByText(URL_1)).toBeVisible()
  expect(screen.getByText(/Schick Anna diesen Link/)).toBeVisible()

  await user.click(button)
  expect(button).toHaveAttribute('aria-expanded', 'false')
  expect(panel).not.toBeVisible()
})

it('copies the link and confirms it', async () => {
  const user = userEvent.setup()
  const writeText = vi.spyOn(navigator.clipboard, 'writeText')
  renderLink()

  await user.click(toggle())
  await user.click(screen.getByRole('button', { name: 'Link kopieren' }))
  expect(writeText).toHaveBeenCalledWith(URL_1)
  expect(screen.getByRole('button', { name: 'Link kopiert' })).toBeInTheDocument()
})

it('offers no share button without the Web Share API', async () => {
  const user = userEvent.setup()
  renderLink()
  await user.click(toggle())
  expect(screen.queryByRole('button', { name: 'Teilen' })).not.toBeInTheDocument()
})

it('shares the link when the device can share', async () => {
  const user = userEvent.setup()
  const share = vi.fn<(data: ShareData) => Promise<void>>(async () => {})
  stubShare(share)
  renderLink()

  await user.click(toggle())
  await user.click(screen.getByRole('button', { name: 'Teilen' }))
  expect(share).toHaveBeenCalledWith({ title: 'Wine Tasting', text: 'Dein Link zurück zu „Weinabend bei Paul“', url: URL_1 })
})

it('treats a closed share sheet as no error', async () => {
  const user = userEvent.setup()
  stubShare(vi.fn(async () => Promise.reject(new DOMException('Share canceled', 'AbortError'))))
  renderLink()

  await user.click(toggle())
  await user.click(screen.getByRole('button', { name: 'Teilen' }))
  expect(screen.getByRole('button', { name: 'Teilen' })).toBeInTheDocument()
})

it('asks before locking the link', async () => {
  const user = userEvent.setup()
  const { lockAction } = renderLink()

  await user.click(toggle())
  await user.click(screen.getByRole('button', { name: 'Link sperren' }))
  expect(screen.getByRole('alertdialog', { name: 'Link für Anna sperren?' })).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Sperren' }))
  expect(lockAction).toHaveBeenCalledTimes(1)
})

it('keeps the panel open and announces a new link', async () => {
  const user = userEvent.setup()
  const { rerender } = renderLink()
  await user.click(toggle())
  // The live region is there before the change, outside the copy button
  const live = document.querySelector('div > span[aria-live="polite"]')!
  expect(live).toBeEmptyDOMElement()

  rerender(URL_2)
  expect(toggle()).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByText(URL_2)).toBeVisible()
  expect(live).toHaveTextContent('Neuer Link erstellt.')

  // Closing clears the note
  await user.click(toggle())
  expect(live).toBeEmptyDOMElement()
})
