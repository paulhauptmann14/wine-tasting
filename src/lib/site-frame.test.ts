import { expect, it } from 'vitest'
import { siteFrame } from './site-frame'

it('uses the admin width in the whole admin area', () => {
  expect(siteFrame('/tasting/8GXBW5/admin')).toBe('admin')
  expect(siteFrame('/tasting/8GXBW5/admin/wines')).toBe('admin')
})

it('uses the wide width for the table view only', () => {
  expect(siteFrame('/tasting/8GXBW5/table')).toBe('table')
  expect(siteFrame('/tasting/8GXBW5/table/')).toBe('table')
})

it('uses the page width everywhere else', () => {
  for (const path of ['/', '/new', '/manage', '/impressum', '/tasting/8GXBW5', '/tasting/8GXBW5/wine/1', '/tasting/8GXBW5/results']) {
    expect(siteFrame(path)).toBe('page')
  }
  // Only the segment right after the code counts
  expect(siteFrame('/tasting/8GXBW5/wine/admin')).toBe('page')
})
