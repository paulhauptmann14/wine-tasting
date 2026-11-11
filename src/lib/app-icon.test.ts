import { readFileSync } from 'node:fs'
import { expect, it } from 'vitest'
import { APP_ICON_COLORS, appIconSvg } from './app-icon'
import { glassMarkSvg } from './glass-mark'

it('draws the bold glass mark in the wine color as favicon', () => {
  const svg = appIconSvg()
  expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 100 100"/)
  expect(svg).toContain(`color="${APP_ICON_COLORS.wine}"`)
  expect(svg).toBe(glassMarkSvg({ color: APP_ICON_COLORS.wine, darkColor: APP_ICON_COLORS.wineDark, bold: true }))
})

it('switches to the rosé mark in dark mode only without a background', () => {
  expect(appIconSvg()).toContain(`prefers-color-scheme: dark){svg{color:${APP_ICON_COLORS.wineDark}}}`)
  const tile = appIconSvg({ background: APP_ICON_COLORS.background })
  expect(tile).not.toContain('prefers-color-scheme')
  expect(tile).toContain(`fill="${APP_ICON_COLORS.background}"`)
})

it('matches the checked-in favicon', () => {
  // src/app/icon.svg is generated from appIconSvg() – regenerate it when the mark changes:
  // npx tsx -e "import('./src/lib/app-icon.ts').then(m => process.stdout.write(m.appIconSvg() + '\n'))" > src/app/icon.svg
  expect(readFileSync('src/app/icon.svg', 'utf8')).toBe(`${appIconSvg()}\n`)
})
