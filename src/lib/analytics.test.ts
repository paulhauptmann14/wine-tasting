import { expect, it } from 'vitest'
import { redactTastingCode } from './analytics'

it('replaces the tasting code in paths', () => {
  expect(redactTastingCode('https://x.app/tasting/8GXBW5/wine/2?saved=1'))
    .toBe('https://x.app/tasting/[code]/wine/2?saved=1')
  expect(redactTastingCode('https://x.app/tasting/8GXBW5')).toBe('https://x.app/tasting/[code]')
})

it('replaces the tasting code in the manage query', () => {
  expect(redactTastingCode('https://x.app/manage?code=8GXBW5')).toBe('https://x.app/manage?code=%5Bcode%5D')
})

it('leaves other urls alone', () => {
  expect(redactTastingCode('https://x.app/new')).toBe('https://x.app/new')
})
