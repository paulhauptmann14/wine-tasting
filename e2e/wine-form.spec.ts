import { expect, test } from '@playwright/test'
import { createTasting } from './helpers'

test('Wein braucht Name und Weinart; das Weingut ist freiwillig und steht in der Liste', async ({ page }) => {
  await createTasting(page, 'E2E Weinformular')
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  await expect(page.getByText('Pflichtfeld')).toHaveCount(1)

  // Name alone is not enough
  await page.getByLabel('Name', { exact: true }).fill('Kabinett')
  await page.getByLabel('Weingut').fill('Weingut Dr. Loosen')
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await expect(page.getByText('Bitte wähle die Weinart.')).toBeVisible()
  await expect(page.getByRole('listitem')).toHaveCount(0)
  // The entries survive the error
  await expect(page.getByLabel('Weingut')).toHaveValue('Weingut Dr. Loosen')

  await page.getByLabel('Weinart').selectOption({ label: 'Weißwein' })
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await expect(page.getByText('Weingut Dr. Loosen · Weißwein')).toBeVisible()

  // Without a winery the line starts with the type
  await page.getByLabel('Name', { exact: true }).fill('Spätburgunder')
  await page.getByLabel('Weinart').selectOption({ label: 'Rotwein' })
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await expect(page.getByRole('list').getByText('Rotwein', { exact: true })).toBeVisible()

  // Editing keeps the winery and requires the type to stay chosen
  await page.getByRole('button', { name: 'Wein #1 bearbeiten' }).click()
  await expect(page.getByLabel('Weingut').first()).toHaveValue('Weingut Dr. Loosen')
  await page.getByLabel('Weinart').first().selectOption({ label: 'Bitte wählen' })
  await page.getByRole('button', { name: 'Speichern' }).first().click()
  await expect(page.getByText('Bitte wähle die Weinart.').first()).toBeVisible()
})

test('Beschreibung ist freiwillig, steht unter den Angaben und bleibt beim Bearbeiten erhalten', async ({ page }) => {
  await createTasting(page, 'E2E Beschreibung')
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  const description = page.getByLabel('Beschreibung', { exact: true })
  await expect(description).toHaveAttribute('placeholder', 'z. B. fruchtig, Noten von Kirsche')

  await page.getByLabel('Name', { exact: true }).fill('Innamorati')
  await page.getByLabel('Weinart').selectOption({ label: 'Weißwein' })
  await page.getByLabel('Geschmacksrichtung').selectOption({ label: 'süß' })
  await description.fill('Süß & fruchtig')
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  const row = page.getByRole('listitem').filter({ hasText: 'Innamorati' })
  await expect(row.getByText('Weißwein · süß')).toBeVisible()
  await expect(row.getByText('Süß & fruchtig')).toBeVisible()
  // The form is empty again for the next wine
  await expect(description).toHaveValue('')

  await page.getByRole('button', { name: 'Wein #1 bearbeiten' }).click()
  await expect(page.getByLabel('Beschreibung', { exact: true }).first()).toHaveValue('Süß & fruchtig')
  await page.getByLabel('Beschreibung', { exact: true }).first().fill('')
  await page.getByRole('button', { name: 'Speichern' }).click()
  await expect(row.getByText('Süß & fruchtig')).toHaveCount(0)
})

test('Alkohol ist freiwillig, nimmt Komma oder Punkt und steht am Ende der Angaben', async ({ page }) => {
  await createTasting(page, 'E2E Alkohol')
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  const alcohol = page.getByLabel('Alkohol in % vol')
  await expect(alcohol).toHaveAttribute('inputmode', 'decimal')

  await page.getByLabel('Name', { exact: true }).fill('Appassimento')
  await page.getByLabel('Weinart').selectOption({ label: 'Rotwein' })
  await alcohol.fill('30')
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await expect(page.getByText('Alkohol zwischen 0 und 25 % vol, z. B. 13,5.')).toBeVisible()
  // A validation error elsewhere keeps the chosen wine type
  await expect(page.getByLabel('Weinart')).toHaveValue('red')

  await alcohol.fill('14.5')
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  const row = page.getByRole('listitem').filter({ hasText: 'Appassimento' })
  await expect(row.getByText('Rotwein · 14,5 % vol')).toBeVisible()
  await expect(alcohol).toHaveValue('')

  await page.getByRole('button', { name: 'Wein #1 bearbeiten' }).click()
  await expect(page.getByLabel('Alkohol in % vol').first()).toHaveValue('14,5')
})
