import { beforeEach, expect, it, vi } from 'vitest'

vi.mock('@/lib/tasting/code', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/tasting/code')>()
  return { ...actual, generateCode: vi.fn() }
})

import { generateCode } from '@/lib/tasting/code'
import { createTestDb } from '@/test/db'
import type { Db } from '@/db/types'
import { createTasting } from './tastings'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

it('retries with a new code when the code is already taken', async () => {
  vi.mocked(generateCode)
    .mockReturnValueOnce('AAAAAA')
    .mockReturnValueOnce('AAAAAA')
    .mockReturnValueOnce('BBBBBB')
  const input = { name: 'T', blindTasting: false, preset: 'simple' as const, pin: '1234' }
  expect((await createTasting(db, input)).code).toBe('AAAAAA')
  expect((await createTasting(db, input)).code).toBe('BBBBBB')
})
