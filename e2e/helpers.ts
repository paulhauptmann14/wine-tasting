import { expect, type Browser, type Page, type TestInfo } from '@playwright/test'

/** Separate browser context per guest, using the current project's device (phone/tablet/laptop). */
export async function newGuest(browser: Browser, testInfo: TestInfo): Promise<Page> {
  const u = testInfo.project.use
  const context = await browser.newContext({
    baseURL: u.baseURL,
    viewport: u.viewport,
    userAgent: u.userAgent,
    deviceScaleFactor: u.deviceScaleFactor,
    isMobile: u.isMobile,
    hasTouch: u.hasTouch,
  })
  return context.newPage()
}

/** The tasting code from the current URL (/tasting/<code>/…). */
export function tastingCode(page: Page): string {
  return page.url().match(/\/tasting\/([2-9A-HJ-NP-Z]{6})\//)![1]
}

/** Creates a tasting with PIN 1234 and the default settings; ends on its admin page. */
export async function createTasting(page: Page, name: string): Promise<string> {
  await page.goto('/new')
  await page.getByLabel('Name der Verkostung').fill(name)
  await page.getByLabel('Admin-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/admin$/)
  return tastingCode(page)
}

/** Adds wines with a name only, from anywhere in the admin area. */
export async function addWines(page: Page, names: string[]) {
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  for (const name of names) {
    await page.getByLabel('Name', { exact: true }).fill(name)
    await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  }
}

export async function startTasting(page: Page) {
  await page.getByRole('link', { name: 'Allgemein', exact: true }).click()
  await page.getByRole('button', { name: 'Tasting starten' }).click()
}

/** Joins a running tasting as a guest. */
export async function joinAs(page: Page, code: string, name: string) {
  await page.goto(`/tasting/${code}`)
  await page.getByLabel('Wie heißt du?').fill(name)
  await page.getByRole('button', { name: 'Beitreten' }).click()
  // The counter exists with and without blind tasting (wine names differ)
  await expect(page.getByText(/\d+ von \d+ bewertet/)).toBeVisible()
}

/** Rates the wines of a blind tasting in order, from the guest's wine list. */
export async function rateWines(page: Page, scores: number[], notes: string[] = []) {
  await page.getByRole('link', { name: /Wein #1/ }).first().click()
  for (const [i, stars] of scores.entries()) {
    await expect(page.getByRole('heading', { name: `Wein #${i + 1}` })).toBeVisible()
    const groups = page.getByRole('radiogroup')
    for (let g = 0; g < (await groups.count()); g++) {
      await groups.nth(g).getByRole('radio', { name: `${stars} von 5 Sternen` }).click()
    }
    if (notes[i]) await page.getByLabel('Was schmeckst du?').fill(notes[i])
    const isLast = i === scores.length - 1
    await page.getByRole('button', { name: isLast ? 'Speichern & fertig' : 'Speichern & weiter' }).click()
  }
  await expect(page.getByText(`${scores.length} von ${scores.length} bewertet`)).toBeVisible()
}
