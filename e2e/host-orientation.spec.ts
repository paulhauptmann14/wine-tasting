import { expect, test } from './fixtures'
import { addWines, createTasting, joinAs, startTasting } from './helpers'

test('PIN ist beim Erstellen sichtbar, danach sagt „Teilen“, was als Nächstes kommt', async ({ page }) => {
  await page.goto('/new')
  const pin = page.getByLabel('Deine Gastgeber-PIN')
  await expect(pin).toHaveAttribute('type', 'text')
  await expect(pin).toHaveAccessibleDescription(/sie lässt sich nicht zurücksetzen/)
  await expect(page.getByRole('radio', { name: /5-Punkte-Schema.*Empfohlen/ })).toBeChecked()

  await page.getByLabel('Name der Verkostung').fill('E2E Orientierung')
  await pin.fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/admin$/)

  await expect(page.getByText(/Merk dir den Code .* und deine PIN/)).toBeVisible()
  await page.getByRole('link', { name: 'Trag deine Weine ein' }).click()
  await page.waitForURL(/\/admin\/wines$/)
  await addWines(page, ['Riesling'])
  await page.getByRole('link', { name: 'Teilen', exact: true }).click()
  await expect(page.getByText('Wenn alle da sind: Tasting starten.')).toBeVisible()
})

test('alle Admin-Tabs sind bei 375 px sichtbar, ohne seitlich zu scrollen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await createTasting(page, 'E2E Tabs')
  const nav = page.getByRole('navigation', { name: 'Verwaltung' })
  for (const tab of ['Teilen', 'Allgemein', 'Weine', 'Bewertung', 'Teilnehmer', 'Ergebnisse']) {
    await expect(nav.getByRole('link', { name: tab, exact: true })).toBeInViewport({ ratio: 1 })
  }
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('„Zurück in Vorbereitung“ fragt nach und Beenden nennt offene Gäste', async ({ page, newGuest }) => {
  const code = await createTasting(page, 'E2E Anhalten')
  await addWines(page, ['Riesling'])
  await startTasting(page)

  // A guest joins but hasn't rated yet
  const guest = await newGuest()
  await joinAs(guest, code, 'Anna')
  await page.reload()

  await page.getByRole('button', { name: 'Tasting beenden', exact: true }).click()
  const finish = page.getByRole('alertdialog')
  await expect(finish.getByText(/1 Gast ist noch nicht fertig\./)).toBeVisible()
  await finish.getByRole('button', { name: 'Abbrechen' }).click()

  await page.getByRole('button', { name: 'Zurück in Vorbereitung' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByText('Deine Gäste können so lange nicht bewerten. Bisherige Bewertungen bleiben.')).toBeVisible()
  // Cancelling keeps the tasting running
  await dialog.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page.getByRole('button', { name: 'Tasting beenden', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Zurück in Vorbereitung' }).click()
  await page.getByRole('alertdialog').getByRole('button', { name: 'Zurück in Vorbereitung' }).click()
  await expect(page.getByRole('button', { name: 'Tasting starten' })).toBeVisible()
})
