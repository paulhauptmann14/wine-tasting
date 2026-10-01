import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'

// Layouts schützen Seiten nicht: Next rendert Seiten-Segmente auch per RSC-Anfrage,
// ohne das Layout erneut auszuführen. Jede Admin-Seite muss selbst prüfen.
const adminDir = join(process.cwd(), 'src/app/tasting/[code]/admin')

function pages(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return pages(path)
    return entry === 'page.tsx' ? [path] : []
  })
}

it('every admin page checks admin access itself', () => {
  const found = pages(adminDir)
  expect(found.length).toBeGreaterThanOrEqual(6)
  for (const page of found) {
    expect(readFileSync(page, 'utf8'), page).toMatch(/getAdminTasting\(/)
  }
})
