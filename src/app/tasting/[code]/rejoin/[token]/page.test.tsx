// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { requireTasting } from '@/lib/data'
import { findRejoinParticipant } from '@/server/participants'
import RejoinPage, { metadata } from './page'

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect:${url}`)
  }),
}))
vi.mock('../../actions', () => ({ rejoinAction: vi.fn() }))
vi.mock('@/db/client', () => ({ db: {} }))
vi.mock('@/lib/data', () => ({ requireTasting: vi.fn() }))
vi.mock('@/lib/env', () => ({ getSessionSecret: () => 'secret' }))
vi.mock('@/lib/auth/participant-session', () => ({ getCurrentParticipant: vi.fn() }))
vi.mock('@/server/participants', () => ({ findRejoinParticipant: vi.fn() }))

const LINK = '11111111-1111-4111-8111-111111111111.abcdefghijklmnopqrstuv'
const tasting = (status = 'active') => ({ id: 't1', code: '8GXBW5', name: 'Riesling-Abend', description: null, status })
const open = async (token = LINK) => render(await RejoinPage({ params: Promise.resolve({ code: '8GXBW5', token }) }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(requireTasting).mockResolvedValue(tasting() as never)
  vi.mocked(getCurrentParticipant).mockResolvedValue(null)
  vi.mocked(findRejoinParticipant).mockResolvedValue({ id: 'p1', name: 'Anna' })
})

it('asks before signing in – opening the link alone changes nothing', async () => {
  await open()
  expect(findRejoinParticipant).toHaveBeenCalledWith({}, 't1', LINK, 'secret')
  expect(screen.getByText('Willkommen zurück')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Riesling-Abend')
  expect(screen.getByText(/Du machst als/)).toHaveTextContent('Du machst als Anna weiter – mit allem, was du schon bewertet hast.')
  expect(screen.getByRole('button', { name: 'Als Anna weitermachen' })).toBeInTheDocument()
})

it('warns when this device is signed in as another guest', async () => {
  vi.mocked(getCurrentParticipant).mockResolvedValue({ id: 'p2', name: 'Ben' })
  await open()
  expect(screen.getByText('Auf diesem Gerät bist du gerade als Ben dabei. Danach bist du hier Anna.')).toBeInTheDocument()
})

it('goes straight to the tasting when this device already is that guest', async () => {
  vi.mocked(getCurrentParticipant).mockResolvedValue({ id: 'p1', name: 'Anna' })
  await expect(open()).rejects.toThrow('redirect:/tasting/8GXBW5')
})

it('names nobody for an invalid link and offers the way back to the tasting', async () => {
  vi.mocked(findRejoinParticipant).mockResolvedValue(null)
  const { container } = await open()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dieser Link gilt nicht mehr.')
  expect(screen.getByRole('link', { name: 'Zum Tasting' })).toHaveAttribute('href', '/tasting/8GXBW5')
  expect(container).not.toHaveTextContent('Anna')
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})

it('skips the lookup for overlong links', async () => {
  await open('x'.repeat(101))
  expect(findRejoinParticipant).not.toHaveBeenCalled()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Dieser Link gilt nicht mehr.')
})

it('sends guests of a finished tasting to the results', async () => {
  vi.mocked(requireTasting).mockResolvedValue(tasting('finished') as never)
  await expect(open()).rejects.toThrow('redirect:/tasting/8GXBW5/results')
  expect(findRejoinParticipant).not.toHaveBeenCalled()
})

it('keeps the token out of search engines and Referer headers', () => {
  expect(metadata).toMatchObject({ robots: { index: false, follow: false }, referrer: 'no-referrer' })
})
