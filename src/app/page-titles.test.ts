import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP = join(process.cwd(), 'src/app')

function pages(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return pages(path)
    return entry.name === 'page.tsx' ? [path] : []
  })
}

// The home page keeps the layout's default title "Wine Tasting"
const WITHOUT_OWN_TITLE = new Set(['page.tsx'])

describe('page titles', () => {
  it.each(pages(APP).map((path) => relative(APP, path)).filter((path) => !WITHOUT_OWN_TITLE.has(path)))(
    '%s names itself in the browser tab',
    (path) => {
      const source = readFileSync(join(APP, path), 'utf8')
      expect(source).toMatch(/export const metadata[^=]*=\s*\{\s*title:|export async function generateMetadata|export function generateMetadata/)
    },
  )
})
