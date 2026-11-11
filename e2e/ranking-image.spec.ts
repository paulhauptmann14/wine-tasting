import { expect, test } from '@playwright/test'
import { addWines, createTasting, joinAs, newGuest, startTasting } from './helpers'

// Phones share the image, browsers without file sharing download it
const SHARE_OR_DOWNLOAD = /^(Ergebnis als Bild teilen|Bild herunterladen)$/

test('Endergebnis lässt sich erst nach dem Ende als Bild teilen', async ({ page, browser }, testInfo) => {
  const code = await createTasting(page, 'E2E Bildabend')
  const imageUrl = `/tasting/${code}/results/image`
  await addWines(page, ['Riesling'])
  await startTasting(page)

  // One guest rates the wine
  const guest = await newGuest(browser, testInfo)
  await joinAs(guest, code, 'Anna')
  await expect(guest.getByText('0 von 1 bewertet')).toBeVisible()
  await guest.goto(`/tasting/${code}/wine/1`)
  const groups = guest.getByRole('radiogroup')
  for (let g = 0; g < (await groups.count()); g++) {
    await groups.nth(g).getByRole('radio', { name: '4 von 5 Sternen' }).click()
  }
  await guest.getByRole('button', { name: 'Speichern & fertig' }).click()
  await expect(guest.getByText('1 von 1 bewertet')).toBeVisible()

  // While the tasting runs there is neither an image nor a share button – not even for the host
  expect((await page.request.get(imageUrl)).status()).toBe(404)
  expect((await guest.request.get(imageUrl)).status()).toBe(404)
  await guest.goto(`/tasting/${code}/results`)
  await expect(guest.getByText('Riesling').first()).toBeVisible()
  await expect(guest.getByRole('button', { name: SHARE_OR_DOWNLOAD })).toHaveCount(0)

  // Host finishes
  await page.goto(`/tasting/${code}/admin`)
  await page.getByRole('button', { name: 'Tasting beenden & auflösen' }).click()
  await page.getByRole('button', { name: 'Beenden & auflösen' }).click()
  await expect(page.getByText('Beendet', { exact: true }).first()).toBeVisible()

  // Guest's results page: sharing is now the main action, reachable without scrolling
  const guestShare = guest.getByRole('button', { name: SHARE_OR_DOWNLOAD })
  await expect(guestShare).toBeVisible({ timeout: 12_000 })
  await expect(guestShare).toBeInViewport()
  await expect(guest.getByRole('link', { name: 'Bild öffnen' })).toHaveAttribute('href', imageUrl)

  const image = await guest.request.get(imageUrl)
  expect(image.status()).toBe(200)
  expect(image.headers()['content-type']).toBe('image/png')
  expect(image.headers()['cache-control']).toContain('no-store')
  expect(image.headers()['content-disposition']).toContain('filename="e2e-bildabend-ergebnis.png"')
  const body = await image.body()
  expect(body.subarray(1, 4).toString('ascii')).toBe('PNG')
  expect(body.length).toBeGreaterThan(5_000)

  // Phones: the footer links stay reachable below the bar
  if (testInfo.project.name !== 'laptop') {
    await guest.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    const impressum = guest.getByRole('link', { name: 'Impressum' })
    const box = (await impressum.boundingBox())!
    const hit = await guest.evaluate(([x, y]) => document.elementFromPoint(x, y)?.textContent, [box.x + box.width / 2, box.y + box.height / 2])
    expect(hit).toBe('Impressum')
  }

  // Without file sharing (typical laptop browser) the button says so and downloads the image
  if (testInfo.project.name === 'laptop') {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined }))
    await page.goto(`/tasting/${code}/results`)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Bild herunterladen' }).click()
    expect((await download).suggestedFilename()).toBe('e2e-bildabend-ergebnis.png')
  }
})
