// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GuardedLink, UnsavedGuardProvider, useUnsavedGuard } from './unsaved-guard'

// A plain anchor, so a click on it reports whether the default (navigation) was prevented
vi.mock('next/link', () => ({
  default: ({ href, ...props }: { href: string }) => <a href={href} {...props} />,
}))

function Controls() {
  const guard = useUnsavedGuard()
  return <button onClick={guard.markDirty}>Stern</button>
}

function HintText() {
  return <p role="status">{useUnsavedGuard().hint ? 'Hinweis sichtbar' : ''}</p>
}

let off = () => {}

function setup() {
  const seen: string[] = []
  // Bubbles up after React's handler ran; the anchor's own default is cancelled so jsdom doesn't navigate
  const probe = (e: MouseEvent) => {
    if (!(e.target as Element).closest('a')) return
    seen.push(e.defaultPrevented ? 'blocked' : 'navigated')
    e.preventDefault()
  }
  document.addEventListener('click', probe)
  off = () => document.removeEventListener('click', probe)
  render(
    <UnsavedGuardProvider>
      <Controls />
      <HintText />
      <GuardedLink href="/wine/2">Ring 2</GuardedLink>
    </UnsavedGuardProvider>,
  )
  return { seen, link: screen.getByRole('link', { name: 'Ring 2' }), star: screen.getByRole('button', { name: 'Stern' }) }
}

afterEach(() => {
  vi.useRealTimers()
  off()
})

it('lets taps through while nothing is unsaved', async () => {
  const { seen, link } = setup()
  await userEvent.click(link)
  expect(seen).toEqual(['navigated'])
  expect(screen.getByRole('status')).toHaveTextContent('')
})

it('swallows the first tap with unsaved stars, shows the hint, and lets the second one navigate', async () => {
  const { seen, link, star } = setup()
  await userEvent.click(star)
  seen.length = 0
  await userEvent.click(link)
  expect(screen.getByRole('status')).toHaveTextContent('Hinweis sichtbar')
  await userEvent.click(link)
  expect(seen).toEqual(['blocked', 'navigated'])
})

it('asks again after the hint faded away or the stars changed', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
  const { seen, link, star } = setup()
  await user.click(star)
  seen.length = 0
  await user.click(link) // blocked
  await act(async () => {
    vi.advanceTimersByTime(4000)
  })
  expect(screen.getByRole('status')).toHaveTextContent('')
  await user.click(link) // hint was gone: blocked again
  await user.click(star)
  await user.click(link) // stars changed: blocked again
  expect(seen).toEqual(['blocked', 'blocked', 'blocked'])
})

it('never blocks a tap with a modifier key (new tab)', async () => {
  const user = userEvent.setup()
  const { seen, link, star } = setup()
  await user.click(star)
  await user.keyboard('{Control>}')
  await user.click(link)
  await user.keyboard('{/Control}')
  expect(seen).toEqual(['navigated'])
})
