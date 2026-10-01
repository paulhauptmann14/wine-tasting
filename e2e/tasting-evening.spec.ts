import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test'

/** Eigener Browser-Kontext pro Gast – mit dem Gerät des aktuellen Projekts (Handy/Laptop). */
async function newGuest(browser: Browser, testInfo: TestInfo): Promise<Page> {
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

async function joinAs(page: Page, code: string, name: string) {
  await page.goto(`/tasting/${code}`)
  await page.getByLabel('Wie heißt du?').fill(name)
  await page.getByRole('button', { name: 'Beitreten' }).click()
  await expect(page.getByRole('link', { name: /Wein #1/ }).first()).toBeVisible()
}

async function rateWines(page: Page, scores: number[]) {
  await page.getByRole('link', { name: /Wein #1/ }).first().click()
  for (const [i, stars] of scores.entries()) {
    await expect(page.getByRole('heading', { name: `Wein #${i + 1}` })).toBeVisible()
    const groups = page.getByRole('radiogroup')
    for (let g = 0; g < (await groups.count()); g++) {
      await groups.nth(g).getByRole('radio', { name: `${stars} von 5 Sternen` }).click()
    }
    const isLast = i === scores.length - 1
    await page.getByRole('button', { name: isLast ? 'Speichern & fertig' : 'Speichern & weiter' }).click()
  }
  await expect(page.getByText(`${scores.length} von ${scores.length} bewertet`)).toBeVisible()
}

test('kompletter Tasting-Abend mit Blindverkostung', async ({ page, browser }, testInfo) => {
  // Gastgeber erstellt das Tasting (Blindverkostung ist vorausgewählt)
  await page.goto('/')
  await page.getByRole('link', { name: 'Tasting erstellen' }).click()
  await page.getByLabel('Name der Verkostung').fill('E2E Weinabend')
  await page.getByText('Einfach', { exact: true }).click()
  await page.getByLabel('Admin-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/tasting\/[2-9A-HJ-NP-Z]{6}\/admin$/)
  const code = page.url().match(/\/tasting\/([2-9A-HJ-NP-Z]{6})\//)![1]

  // Weine anlegen
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  for (const [name, vintage] of [
    ['Riesling', '2022'],
    ['Spätburgunder', '2020'],
  ]) {
    await page.getByLabel('Name', { exact: true }).fill(name)
    await page.getByLabel('Jahrgang').fill(vintage)
    await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  }

  // Gastgeber bewertet selbst mit und startet direkt von seiner Warteseite aus
  await page.getByRole('link', { name: 'Teilen', exact: true }).click()
  await page.getByRole('link', { name: 'Selbst mitbewerten' }).click()
  await page.getByLabel('Wie heißt du?').fill('Gastgeber')
  await page.getByRole('button', { name: 'Beitreten' }).click()
  await expect(page.getByText('Du bist Gastgeber. Starte das Tasting, sobald alle da sind.')).toBeVisible()
  await page.getByRole('button', { name: 'Tasting starten' }).click()
  await expect(page.getByRole('link', { name: /Wein #1/ }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Verwaltung' })).toBeVisible()

  // Zwei Gäste bewerten blind – ohne Zugang zur Verwaltung
  const anna = await newGuest(browser, testInfo)
  await joinAs(anna, code, 'Anna')
  await expect(anna.getByText('Riesling')).toHaveCount(0)
  await expect(anna.getByRole('link', { name: 'Verwaltung' })).toHaveCount(0)
  await rateWines(anna, [5, 3])

  const ben = await newGuest(browser, testInfo)
  await joinAs(ben, code, 'Ben')
  await rateWines(ben, [4, 2])

  // Live-Ergebnisse ohne Namen
  await anna.goto(`/tasting/${code}/results`)
  await expect(anna.getByText('4,5').first()).toBeVisible()
  await expect(anna.getByText('Riesling')).toHaveCount(0)

  // Gastgeber geht aus der Gästeansicht zurück in die Verwaltung und beendet → Namen erscheinen bei Anna
  await page.getByRole('link', { name: 'Verwaltung' }).click()
  await page.getByRole('button', { name: 'Tasting beenden & auflösen' }).click()
  await page.getByRole('button', { name: 'Beenden & auflösen' }).click()
  await expect(page.getByText('Beendet', { exact: true }).first()).toBeVisible()
  await expect(anna.getByText('Riesling').first()).toBeVisible({ timeout: 12_000 })
  await expect(anna.getByText('Endergebnis')).toBeVisible()
})

test('unbekannter Code zeigt die Fehlerseite', async ({ page }) => {
  await page.goto('/tasting/222222')
  await expect(page.getByRole('heading', { name: 'Tasting nicht gefunden' })).toBeVisible()
})
