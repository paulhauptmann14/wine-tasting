import { expect, it } from 'vitest'
import { SITE_FRAME_CLASSES, siteFrame } from './site-frame'

it('uses the admin width in the whole admin area', () => {
  expect(siteFrame('/tasting/8GXBW5/admin')).toBe('admin')
  expect(siteFrame('/tasting/8GXBW5/admin/wines')).toBe('admin')
})

it('uses the wide width for the table view only', () => {
  expect(siteFrame('/tasting/8GXBW5/table')).toBe('table')
  expect(siteFrame('/tasting/8GXBW5/table/')).toBe('table')
})

it('gives the results page and the legal pages their narrower laptop column', () => {
  expect(siteFrame('/tasting/8GXBW5/results')).toBe('results')
  expect(siteFrame('/impressum')).toBe('reading')
  expect(siteFrame('/datenschutz')).toBe('reading')
  // Narrower than the page frame on laptops, identical below
  expect(SITE_FRAME_CLASSES.results).toContain('lg:max-w-[960px]')
  expect(SITE_FRAME_CLASSES.reading).toContain('lg:max-w-[720px]')
})

it('uses the page width everywhere else', () => {
  for (const path of ['/', '/new', '/manage', '/tasting/8GXBW5', '/tasting/8GXBW5/wine/1']) {
    expect(siteFrame(path)).toBe('page')
  }
  // Only the segment right after the code counts
  expect(siteFrame('/tasting/8GXBW5/wine/admin')).toBe('page')
})
