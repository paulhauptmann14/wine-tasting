import { expect, test, type Browser, type Page, type TestInfo } from '@playwright/test'

/** Separate browser context per guest, using the current project's device (phone/laptop). */
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

async function rateWines(page: Page, scores: number[], notes: string[] = []) {
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

test('kompletter Tasting-Abend mit Blindverkostung', async ({ page, browser }, testInfo) => {
  // Host creates the tasting (blind tasting is preselected)
  await page.goto('/')
  await page.getByRole('link', { name: 'Tasting erstellen' }).click()
  await page.getByLabel('Name der Verkostung').fill('E2E Weinabend')
  await page.getByText('Einfach', { exact: true }).click()
  await page.getByLabel('Admin-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/tasting\/[2-9A-HJ-NP-Z]{6}\/admin$/)
  const code = page.url().match(/\/tasting\/([2-9A-HJ-NP-Z]{6})\//)![1]

  // Add wines
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  for (const [name, wineType, vintage, sweetness] of [
    ['Riesling', 'Weißwein', '2022', 'trocken'],
    ['Spätburgunder', 'keine Angabe', '2020', 'keine Angabe'],
  ]) {
    await page.getByLabel('Name', { exact: true }).fill(name)
    await page.getByLabel('Weinart').selectOption({ label: wineType })
    await page.getByLabel('Jahrgang').fill(vintage)
    await page.getByLabel('Geschmacksrichtung').selectOption({ label: sweetness })
    await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  }

  // Host rates along and starts right from their waiting page
  await page.getByRole('link', { name: 'Zum Tasting' }).click()
  await page.getByLabel('Wie heißt du?').fill('Gastgeber')
  await page.getByRole('button', { name: 'Beitreten' }).click()
  await expect(page.getByText('Du bist Gastgeber. Starte das Tasting, sobald alle da sind.')).toBeVisible()
  await page.getByRole('button', { name: 'Tasting starten' }).click()
  await expect(page.getByRole('link', { name: /Wein #1/ }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Verwaltung' })).toBeVisible()

  // Two guests rate blind – the admin area asks them for the PIN
  const anna = await newGuest(browser, testInfo)
  await joinAs(anna, code, 'Anna')
  await expect(anna.getByText('Riesling')).toHaveCount(0)
  await expect(anna.getByText('trocken')).toHaveCount(0)
  await expect(anna.getByText('Weißwein')).toHaveCount(0)
  await anna.getByRole('link', { name: 'Verwaltung' }).click()
  await expect(anna.getByLabel('PIN')).toBeVisible()
  await expect(anna.getByRole('link', { name: 'Weine', exact: true })).toHaveCount(0)
  await anna.goto(`/tasting/${code}`)
  await rateWines(anna, [5, 3], ['Pfirsich, sehr frisch'])

  const ben = await newGuest(browser, testInfo)
  await joinAs(ben, code, 'Ben')
  await rateWines(ben, [4, 2])

  // Live results without names
  await anna.goto(`/tasting/${code}/results`)
  await expect(anna.getByText('4,5').first()).toBeVisible()
  await expect(anna.getByText('Riesling')).toHaveCount(0)
  // Notes only at the end
  await expect(anna.getByText('Pfirsich, sehr frisch')).toHaveCount(0)

  // Host goes from the guest view back to the admin area and finishes → names appear for Anna
  await page.getByRole('link', { name: 'Verwaltung' }).click()
  // While the tasting is running, reordering and deleting are locked
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Wein #1 löschen' })).toBeDisabled()
  await expect(page.getByText('Das Tasting läuft. Zum Umsortieren oder Löschen zurück in die Vorbereitung.')).toBeVisible()
  // … and can get back to their wines at any time during the tasting
  await page.getByRole('link', { name: 'Zum Tasting' }).click()
  await expect(page.getByRole('link', { name: /Wein #1/ }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Verwaltung' }).click()
  await page.getByRole('button', { name: 'Tasting beenden & auflösen' }).click()
  await page.getByRole('button', { name: 'Beenden & auflösen' }).click()
  await expect(page.getByText('Beendet', { exact: true }).first()).toBeVisible()
  await expect(anna.getByText('Riesling').first()).toBeVisible({ timeout: 12_000 })
  await expect(anna.getByText('Weißwein · 2022 · trocken').first()).toBeVisible()
  // … and the notes, without names
  const notes = anna.getByRole('region', { name: 'Notizen' })
  await expect(notes.getByText('„Pfirsich, sehr frisch“')).toBeVisible()
  await expect(notes.getByText('Anna')).toHaveCount(0)
  await expect(anna.getByText('Endergebnis')).toBeVisible()
})

test('Gäste kommen auch per RSC-Anfrage nicht an die Admin-Daten', async ({ page, browser }, testInfo) => {
  await page.goto('/new')
  await page.getByLabel('Name der Verkostung').fill('E2E Geheim')
  await page.getByLabel('Admin-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/admin$/)

  // Record a real client navigation by the host (RSC request with router state)
  const captured = page.waitForRequest((r) => r.headers()['rsc'] === '1' && r.url().includes('/admin/wines'))
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  const request = await captured
  await page.getByLabel('Name', { exact: true }).fill('Geheimwein')
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await expect(page.getByText('Geheimwein', { exact: true })).toBeVisible()

  const replay = async (target: Page) =>
    (await target.request.get(request.url(), { headers: request.headers(), maxRedirects: 5 })).text()

  // Control: with the admin cookie the response contains the wine – so the test can detect a leak
  expect(await replay(page)).toContain('Geheimwein')
  // A guest without the admin cookie only gets the login redirect, no wine data
  const guest = await newGuest(browser, testInfo)
  expect(await replay(guest)).not.toContain('Geheimwein')
})

test('Gastgeber kommt vom Gäste-Gerät mit der PIN in die Verwaltung', async ({ page, browser }, testInfo) => {
  await page.goto('/new')
  await page.getByLabel('Name der Verkostung').fill('E2E Zweitgerät')
  await page.getByLabel('Admin-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/admin$/)
  const code = page.url().match(/\/tasting\/([2-9A-HJ-NP-Z]{6})\//)![1]
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Riesling')
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await page.getByRole('link', { name: 'Allgemein', exact: true }).click()
  await page.getByRole('button', { name: 'Tasting starten' }).click()

  // The guest phone is in the middle of the tasting and knows the PIN
  const phone = await newGuest(browser, testInfo)
  await joinAs(phone, code, 'Paul')
  await phone.getByRole('link', { name: 'Verwaltung' }).click()
  await phone.waitForURL(/\/manage\?code=/)
  await expect(phone.getByLabel('Code', { exact: true })).toHaveValue(code)
  await phone.getByLabel('PIN').fill('9999')
  await phone.getByRole('button', { name: 'Weiter' }).click()
  await expect(phone.getByText('Die PIN stimmt nicht.')).toBeVisible()
  await phone.getByLabel('PIN').fill('1234')
  await phone.getByRole('button', { name: 'Weiter' }).click()
  await phone.waitForURL(new RegExp(`/tasting/${code}/admin$`))
  await expect(phone.getByRole('link', { name: 'Weine', exact: true })).toBeVisible()
})

test('Gastgeber entfernt Teilnehmer und löscht das Tasting', async ({ page, browser }, testInfo) => {
  await page.goto('/new')
  await page.getByLabel('Name der Verkostung').fill('E2E Aufräumen')
  await page.getByLabel('Admin-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/admin$/)
  const code = page.url().match(/\/tasting\/([2-9A-HJ-NP-Z]{6})\//)![1]
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  await page.getByLabel('Name', { exact: true }).fill('Silvaner')
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await expect(page.getByText('Silvaner', { exact: true })).toBeVisible()

  const guest = await newGuest(browser, testInfo)
  await guest.goto(`/tasting/${code}`)
  await guest.getByLabel('Wie heißt du?').fill('Doppelt')
  await guest.getByRole('button', { name: 'Beitreten' }).click()
  await expect(guest.getByText('Hallo Doppelt')).toBeVisible()

  // Progress per guest and removal with confirmation
  await page.getByRole('link', { name: 'Teilnehmer', exact: true }).click()
  await expect(page.getByRole('img', { name: 'Wein #1: offen' })).toBeVisible()
  await page.getByRole('button', { name: 'Doppelt entfernen' }).click()
  await page.getByRole('button', { name: 'Entfernen', exact: true }).click()
  await expect(page.getByText('Noch niemand da.', { exact: false })).toBeVisible()
  await guest.reload()
  await expect(guest.getByLabel('Wie heißt du?')).toBeVisible()

  // Blind tasting saves instantly when toggled – no extra button
  await page.getByRole('link', { name: 'Allgemein', exact: true }).click()
  const blindSwitch = page.getByRole('switch', { name: 'Blindverkostung' })
  await expect(blindSwitch).toBeChecked()
  await blindSwitch.click()
  await expect(page.getByText('Gespeichert.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Blindverkostung' })).not.toBeChecked()

  // Deleting only after typing the code
  const deleteButton = page.getByRole('button', { name: 'Endgültig löschen' })
  await expect(deleteButton).toBeDisabled()
  await page.getByLabel(/Zur Bestätigung den Code/).fill(code.toLowerCase())
  await deleteButton.click()
  await page.waitForURL((url) => url.pathname === '/')
  await page.goto(`/tasting/${code}`)
  await expect(page.getByRole('heading', { name: 'Tasting nicht gefunden' })).toBeVisible()
})

test('unbekannter Code zeigt die Fehlerseite', async ({ page }) => {
  await page.goto('/tasting/222222')
  await expect(page.getByRole('heading', { name: 'Tasting nicht gefunden' })).toBeVisible()
})

test('Sicherheits-Header, robots.txt und App-Icons', async ({ request }) => {
  const home = await request.get('/')
  expect(home.headers()['x-content-type-options']).toBe('nosniff')
  expect(home.headers()['referrer-policy']).toBe('same-origin')
  expect(home.headers()['content-security-policy']).toBe("frame-ancestors 'none'")
  expect(home.headers()['x-robots-tag']).toBeUndefined()

  const tasting = await request.get('/tasting/ZZZZZZ')
  expect(tasting.headers()['x-robots-tag']).toBe('noindex, nofollow')

  expect(await (await request.get('/robots.txt')).text()).toContain('Disallow: /')
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest.name).toBe('Wine Tasting')
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true)
  expect((await request.get('/apple-icon')).headers()['content-type']).toBe('image/png')
})
