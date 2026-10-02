import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { APP_ICON_COLORS, appIconSvg } from './app-icon'

it('draws the glass ring in the wine color', () => {
  const svg = appIconSvg()
  expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100">/)
  expect(svg).toContain(APP_ICON_COLORS.wine)
})

it('switches to the rosé ring in dark mode only without a background', () => {
  expect(appIconSvg()).toContain('prefers-color-scheme: dark')
  const tile = appIconSvg({ background: APP_ICON_COLORS.background })
  expect(tile).not.toContain('prefers-color-scheme')
  expect(tile).toContain(`fill="${APP_ICON_COLORS.background}"`)
})

it('matches the checked-in favicon', () => {
  // src/app/icon.svg is generated from appIconSvg() – regenerate it when the ring changes
  expect(readFileSync('src/app/icon.svg', 'utf8')).toBe(`${appIconSvg()}\n`)
})
