import { afterEach, expect, it, vi } from 'vitest'

const postgres = vi.hoisted(() => vi.fn(() => ({ fake: 'pool' })))
vi.mock('server-only', () => ({}))
vi.mock('postgres', () => ({ default: postgres }))
vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: vi.fn((config: unknown) => config) }))

const globalForDb = globalThis as unknown as { pgClient?: unknown }

afterEach(() => {
  vi.unstubAllEnvs()
  delete globalForDb.pgClient
})

it('opens one pool per process in production, even when the module is loaded twice', async () => {
  // The production build puts this module into several server chunks (pages, route handlers)
  vi.stubEnv('NODE_ENV', 'production')
  await import('./client')
  vi.resetModules()
  await import('./client')
  expect(postgres).toHaveBeenCalledTimes(1)
  expect(postgres).toHaveBeenCalledWith(process.env.DATABASE_URL, { prepare: false })
})
