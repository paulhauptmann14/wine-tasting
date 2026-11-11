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
