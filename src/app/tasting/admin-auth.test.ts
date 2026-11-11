import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

// Layouts don't protect pages: Next also renders page segments via RSC requests
// without running the layout again. Every admin page has to check on its own.
const adminDir = join(process.cwd(), 'src/app/tasting/[code]/admin')

function files(dir: string, name: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return files(path, name)
    return entry === name ? [path] : []
  })
}

it('every admin page checks admin access itself', () => {
  const found = files(adminDir, 'page.tsx')
  expect(found.length).toBeGreaterThanOrEqual(6)
  for (const page of found) {
    expect(readFileSync(page, 'utf8'), page).toMatch(/getAdminTasting\(/)
  }
})

// Server actions can be called directly with any bound arguments – each one checks on its own, too
it('every admin action checks admin access itself', () => {
  const actions = files(adminDir, 'actions.ts').flatMap((file) =>
    readFileSync(file, 'utf8')
      .split(/(?=export async function )/)
      .slice(1)
      .map((block) => ({ name: block.match(/export async function (\w+)/)![1], block })),
  )
  expect(actions.length).toBeGreaterThanOrEqual(13)
  for (const { name, block } of actions) {
    expect(block, name).toMatch(/getAdminTasting\(/)
  }
})
