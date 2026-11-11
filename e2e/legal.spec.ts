import { expect, test } from '@playwright/test'

test('footer links lead to Impressum and Datenschutz', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('contentinfo').getByRole('link', { name: 'Impressum' }).click()
  await expect(page.getByRole('heading', { name: 'Impressum', level: 1 })).toBeVisible()
  await expect(page.getByText('Paul Hauptmann')).toBeVisible()

  await page.getByRole('contentinfo').getByRole('link', { name: 'Datenschutz' }).click()
  await expect(page.getByRole('heading', { name: 'Datenschutz', level: 1 })).toBeVisible()
  await expect(page.getByText(/90 Tage/).first()).toBeVisible()

  // Footer stays reachable above the fixed bottom bar on the create page
  await page.goto('/new')
  const footerLink = page.getByRole('contentinfo').getByRole('link', { name: 'Datenschutz' })
  await footerLink.scrollIntoViewIfNeeded()
  await footerLink.click()
  await expect(page).toHaveURL(/\/datenschutz$/)
})
