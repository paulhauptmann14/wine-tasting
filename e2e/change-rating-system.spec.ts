import { expect, test } from '@playwright/test'
import { addWines, startTasting, tastingCode } from './helpers'

test('Bewertungssystem lässt sich in der Vorbereitung wechseln, danach nicht mehr', async ({ page }) => {
  // Create with "Einfach": a single criterion
  await page.goto('/new')
  await page.getByLabel('Name der Verkostung').fill('System-Wechsel')
  await page.getByText('Einfach', { exact: true }).click()
  await page.getByLabel('Deine Gastgeber-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/admin$/)
  expect(tastingCode(page)).toMatch(/^[2-9A-HJ-NP-Z]{6}$/)

  await page.getByRole('link', { name: 'Bewertung', exact: true }).click()
  await expect(page.getByText('Bewertungssystem:')).toBeVisible()
  await expect(page.getByText('Gesamt', { exact: true }).first()).toBeVisible()
  await expect(page.getByRole('listitem').filter({ hasText: 'Aussehen' })).toHaveCount(0)

  // Switch to 100 points: preview, confirm, new criteria show up
  await page.getByRole('button', { name: 'Ändern', exact: true }).click()
  await page.getByText('100-Punkte-Schema', { exact: true }).click()
  await expect(page.getByText(/Überall 4 Sterne ergeben 90\./)).toBeVisible()
  await page.getByRole('button', { name: 'System übernehmen' }).click()
  const dialog = page.getByRole('alertdialog')
  await expect(dialog.getByText('Deine Kriterien werden durch die des neuen Systems ersetzt.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Kriterien ersetzen' }).click()

  await expect(page.getByText('Bewertungssystem geändert.')).toBeVisible()
  await expect(page.getByRole('radio')).toHaveCount(0)
  for (const name of ['Aussehen', 'Geruch', 'Geschmack', 'Gesamteindruck']) {
    await expect(page.getByRole('listitem').filter({ hasText: name }).first()).toBeVisible()
  }
  await expect(page.getByText('Gesamt', { exact: true })).toHaveCount(0)
  await expect(page.getByText(/Ergebnis von 100/)).toBeVisible()
  await expect(page.getByText('100-Punkte-Schema', { exact: true })).toBeVisible()

  // Cancel closes the picker without changing anything
  await page.getByRole('button', { name: 'Ändern', exact: true }).click()
  await page.getByRole('button', { name: 'Abbrechen' }).click()
  await expect(page.getByRole('radio')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Ändern', exact: true })).toBeFocused()

  // Once the tasting runs, the system is shown but can't be changed
  await addWines(page, ['Riesling'])
  await startTasting(page)
  await page.getByRole('link', { name: 'Bewertung', exact: true }).click()
  await expect(page.getByText('Bewertungssystem:')).toBeVisible()
  await expect(page.getByText('100-Punkte-Schema', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ändern', exact: true })).toHaveCount(0)
})
