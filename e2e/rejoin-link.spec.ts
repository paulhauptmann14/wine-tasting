import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { addWines, createTasting, joinAs, rateAll, startTasting } from './helpers'

/** Opens the host's "Rückkehr-Link" panel for a guest and returns the link as a path (port-independent). */
async function readRejoinLink(host: Page, name: string): Promise<string> {
  const toggle = host.getByRole('button', { name: `Rückkehr-Link für ${name}` })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click()
  const panel = host.locator(`[id="${await toggle.getAttribute('aria-controls')}"]`)
  const url = await panel.getByText(/\/rejoin\//).textContent()
  return new URL(url!.trim()).pathname
}

test('Rückkehr-Link: Gast kommt auf neuem Gerät zurück, Sperren macht den alten Link ungültig', async ({
  page,
  newGuest,
}) => {
  const code = await createTasting(page, 'E2E Rückkehr')
  await addWines(page, ['Riesling', 'Silvaner'])
  await startTasting(page)

  // Anna joins on her phone and rates wine #1
  const anna = await newGuest()
  await joinAs(anna, code, 'Anna')
  await anna.goto(`/tasting/${code}/wine/1`)
  await rateAll(anna, 4)
  await anna.getByRole('button', { name: 'Speichern & weiter' }).click()
  await expect(anna.getByRole('status').filter({ hasText: 'Wein #1 gespeichert.' })).toBeVisible()

  // The host reads Anna's personal link
  await page.getByRole('link', { name: 'Teilnehmer', exact: true }).click()
  const link = await readRejoinLink(page, 'Anna')

  // A new device: opening the link only asks, it does not sign in
  const newPhone = await newGuest()
  await newPhone.goto(link)
  await expect(newPhone.getByText('Willkommen zurück')).toBeVisible()
  await expect(newPhone.getByText(/Du machst als\s*Anna\s*weiter/)).toBeVisible()
  await newPhone.goto(`/tasting/${code}`)
  await expect(newPhone.getByLabel('Wie heißt du?')).toBeVisible()

  // The button signs in – straight into Anna's list with her rating
  await newPhone.goto(link)
  await newPhone.getByRole('button', { name: 'Als Anna weitermachen' }).click()
  await expect(newPhone.getByText('1 von 2 bewertet')).toBeVisible()
  await expect(newPhone).toHaveURL(new RegExp(`/tasting/${code}$`))

  // Anna's first phone stays signed in
  await anna.goto(`/tasting/${code}`)
  await expect(anna.getByText('1 von 2 bewertet')).toBeVisible()

  // Locking: the old link stops working, the panel shows a new one
  await page.getByRole('button', { name: 'Link sperren' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByText('Link für Anna sperren?')).toBeVisible()
  await dialog.getByRole('button', { name: 'Sperren' }).click()
  await expect(page.getByText('Neuer Link erstellt.')).toBeVisible()
  const newLink = await readRejoinLink(page, 'Anna')
  expect(newLink).not.toBe(link)

  const stranger = await newGuest()
  await stranger.goto(link)
  await expect(stranger.getByRole('heading', { name: 'Dieser Link gilt nicht mehr.' })).toBeVisible()
  await expect(stranger.getByText('Anna')).toHaveCount(0)

  // Devices already signed in via the old link stay signed in
  await newPhone.reload()
  await expect(newPhone.getByText('1 von 2 bewertet')).toBeVisible()

  const tablet = await newGuest()
  await tablet.goto(newLink)
  await tablet.getByRole('button', { name: 'Als Anna weitermachen' }).click()
  await expect(tablet.getByText('1 von 2 bewertet')).toBeVisible()
})
