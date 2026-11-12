import { expect, test } from '@playwright/test'
import { newGuest, tastingCode } from './helpers'

test('Beschreibung steht unter dem Namen, lässt sich ändern und wieder leeren', async ({ page, browser }, testInfo) => {
  await page.goto('/new')
  await page.getByLabel('Name der Verkostung').fill('E2E Beschreibung')
  await page.getByLabel('Beschreibung').fill('Rieslinge von der Mosel.\nBring gern Brot mit.')
  await page.getByLabel('Deine Gastgeber-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/admin$/)
  const code = tastingCode(page)
  await expect(page.getByText('Rieslinge von der Mosel.')).toBeVisible()

  // The invitation shows it with its line break
  const guest = await newGuest(browser, testInfo)
  await guest.goto(`/tasting/${code}`)
  const note = guest.getByText(/Rieslinge von der Mosel\./)
  await expect(note).toHaveText('Rieslinge von der Mosel.\nBring gern Brot mit.', { useInnerText: true })

  await page.getByRole('link', { name: 'Allgemein', exact: true }).click()
  const field = page.getByLabel('Beschreibung')
  await expect(field).toHaveValue('Rieslinge von der Mosel.\nBring gern Brot mit.')
  await field.fill('Thema: Mosel')
  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(page.getByText('Gespeichert.')).toBeVisible()
  await guest.reload()
  await expect(guest.getByText('Thema: Mosel')).toBeVisible()

  // Empty → nothing is rendered under the name
  await field.fill('')
  await page.getByRole('button', { name: 'Speichern', exact: true }).click()
  await expect(page.getByText('Thema: Mosel')).toHaveCount(0)
  await guest.reload()
  await expect(guest.getByText('Thema: Mosel')).toHaveCount(0)
  await guest.context().close()
})
