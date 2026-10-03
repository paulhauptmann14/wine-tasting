// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { copyText } from './clipboard'

afterEach(() => vi.unstubAllGlobals())

it('falls back to a hidden textarea without the Clipboard API (plain http in the home network)', async () => {
  vi.stubGlobal('navigator', { ...navigator, clipboard: undefined })
  const execCommand = vi.fn(() => true)
  document.execCommand = execCommand

  expect(await copyText('8GXBW5')).toBe(true)
  expect(execCommand).toHaveBeenCalledWith('copy')
  expect(document.querySelector('textarea')).toBeNull()
})
