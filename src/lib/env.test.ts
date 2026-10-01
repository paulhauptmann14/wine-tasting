import { expect, it } from 'vitest'
import { validateEnv } from './env'

const ok = { DATABASE_URL: 'postgres://u:p@localhost:5432/db', SESSION_SECRET: 'x'.repeat(32) }

it('accepts a complete environment', () => {
  expect(validateEnv(ok)).toEqual([])
})

it('reports missing database url and short or missing secret', () => {
  expect(validateEnv({ ...ok, DATABASE_URL: undefined })).toEqual(['DATABASE_URL fehlt'])
  expect(validateEnv({ ...ok, SESSION_SECRET: 'short' })).toEqual(['SESSION_SECRET muss mindestens 32 Zeichen lang sein'])
  expect(validateEnv({})).toHaveLength(2)
})
