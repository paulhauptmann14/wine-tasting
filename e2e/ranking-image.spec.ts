import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { addWines, createTasting, joinAs, rateAll, startTasting } from './helpers'

// Phones share the image, browsers without file sharing download it
const SHARE_OR_DOWNLOAD = /^(Ergebnis als Bild(er)? teilen|Bild(er)? herunterladen)$/

/** Phones: the fixed bar must not cover the footer links at the very bottom of the page. */
async function expectFooterReachable(page: Page) {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  const impressum = page.getByRole('link', { name: 'Impressum' })
  const box = (await impressum.boundingBox())!
  const hit = await page.evaluate(([x, y]) => document.elementFromPoint(x, y)?.textContent, [box.x + box.width / 2, box.y + box.height / 2])
  expect(hit).toBe('Impressum')
}

test('Endergebnis lässt sich erst nach dem Ende als Bild teilen', async ({ page, newGuest }, testInfo) => {
  const code = await createTasting(page, 'E2E Bildabend')
  const imageUrl = `/tasting/${code}/results/image`
  await addWines(page, ['Riesling'])
  await startTasting(page)

  // One guest rates the wine
  const guest = await newGuest()
  await joinAs(guest, code, 'Anna')
  await expect(guest.getByText('0 von 1 bewertet')).toBeVisible()
  await guest.goto(`/tasting/${code}/wine/1`)
  await rateAll(guest, 4)
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
  // Not blind: nothing to reveal, so the button just says "beenden"
  await page.getByRole('button', { name: 'Tasting beenden', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Beenden', exact: true }).click()
  await expect(page.getByText('Beendet', { exact: true }).first()).toBeVisible()

  // Guest's results page: sharing is now the main action, reachable without scrolling
  const guestShare = guest.getByRole('button', { name: SHARE_OR_DOWNLOAD })
  await expect(guestShare).toBeVisible({ timeout: 12_000 })
  await expect(guestShare).toBeInViewport()
  await expect(guest.getByRole('link', { name: 'Bild öffnen' })).toHaveAttribute('href', imageUrl)

  const image = await guest.request.get(imageUrl)
  expect(image.status()).toBe(200)
  expect(image.headers()['content-type']).toBe('image/png')
  // The browser may keep the image, but asks every time whether the ranking changed
  expect(image.headers()['cache-control']).toBe('private, no-cache')
  expect(image.headers()['content-disposition']).toContain('filename="e2e-bildabend-ergebnis.png"')
  const body = await image.body()
  expect(body.subarray(1, 4).toString('ascii')).toBe('PNG')
  expect(body.length).toBeGreaterThan(5_000)
  const etag = image.headers()['etag']
  expect(etag).toBeTruthy()
  const unchanged = await guest.request.get(imageUrl, { headers: { 'If-None-Match': etag } })
  expect(unchanged.status()).toBe(304)

  // Phones: the footer links stay reachable below the bar
  if (testInfo.project.name !== 'laptop') await expectFooterReachable(guest)

  // Without file sharing (typical laptop browser) the button says so and downloads the image
  if (testInfo.project.name === 'laptop') {
    await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'canShare', { value: undefined }))
    await page.goto(`/tasting/${code}/results`)
    const download = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Bild herunterladen' }).click()
    expect((await download).suggestedFilename()).toBe('e2e-bildabend-ergebnis.png')
  }
})

test('Viele Weine: alle stehen auf mehreren Bildern', async ({ page }, testInfo) => {
  const code = await createTasting(page, 'E2E Bilderabend')
  const imageUrl = `/tasting/${code}/results/image`
  // 25 wines need three images – the most links the bar ever had to make room for
  await addWines(page, Array.from({ length: 25 }, (_, i) => `Wein ${i + 1}`))
  await startTasting(page)
  await page.getByRole('button', { name: 'Tasting beenden', exact: true }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Beenden', exact: true }).click()
  await expect(page.getByText('Beendet', { exact: true }).first()).toBeVisible()

  // The narrowest common phone
  if (testInfo.project.name === 'mobile') await page.setViewportSize({ width: 375, height: 812 })
  await page.goto(`/tasting/${code}/results`)
  await expect(page.getByText('Einzeln öffnen:')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Bild 1' })).toHaveAttribute('href', imageUrl)
  await expect(page.getByRole('link', { name: 'Bild 2' })).toHaveAttribute('href', `${imageUrl}?bild=2`)
  await expect(page.getByRole('link', { name: 'Bild 3' })).toHaveAttribute('href', `${imageUrl}?bild=3`)
  await expect(page.getByRole('link', { name: 'Bild 4' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Bild öffnen' })).toHaveCount(0)

  // Phones: the bar holds only the button, with its whole text, and still leaves the footer reachable
  if (testInfo.project.name !== 'laptop') {
    const share = page.getByRole('button', { name: SHARE_OR_DOWNLOAD })
    await expect(share).toBeInViewport()
    expect(await share.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true)
    await expectFooterReachable(page)
  }

  const second = await page.request.get(`${imageUrl}?bild=2`)
  expect(second.status()).toBe(200)
  expect(second.headers()['content-type']).toBe('image/png')
  expect(second.headers()['content-disposition']).toContain('filename="e2e-bilderabend-ergebnis-2.png"')
  expect((await page.request.get(`${imageUrl}?bild=3`)).status()).toBe(200)
  expect((await page.request.get(`${imageUrl}?bild=4`)).status()).toBe(404)
})
