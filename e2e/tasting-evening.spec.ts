import { expect, test, type Page } from '@playwright/test'
import { addWines, createTasting, joinAs, newGuest, rateWines, startTasting, tastingCode } from './helpers'

test('kompletter Tasting-Abend mit Blindverkostung', async ({ page, browser }, testInfo) => {
  // Host creates the tasting and turns blind tasting on (off by default)
  await page.goto('/')
  await page.getByRole('link', { name: 'Tasting erstellen' }).click()
  await page.getByLabel('Name der Verkostung').fill('E2E Weinabend')
  const createBlind = page.getByRole('switch', { name: 'Blindverkostung' })
  await expect(createBlind).not.toBeChecked()
  await createBlind.click()
  await page.getByText('Einfach', { exact: true }).click()
  await page.getByLabel('Deine Gastgeber-PIN').fill('1234')
  await page.getByRole('button', { name: 'Verkostung erstellen' }).click()
  await page.waitForURL(/\/tasting\/[2-9A-HJ-NP-Z]{6}\/admin$/)
  const code = tastingCode(page)

  // Table view on its own device: only the code, no joining
  const table = await newGuest(browser, testInfo)
  await table.goto(`/tasting/${code}/table`)
  await expect(table.getByText('Scanne den Code und mach mit.')).toBeVisible()
  await expect(table.getByRole('img', { name: /QR-Code/ })).toBeVisible()

  // Add wines
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  for (const [name, winery, wineType, vintage, sweetness, description] of [
    ['Riesling', 'Weingut Dr. Loosen', 'Weißwein', '2022', 'trocken', 'Mineralisch & spritzig'],
    ['Spätburgunder', '', 'Rotwein', '2020', 'keine Angabe', ''],
  ]) {
    await page.getByLabel('Name', { exact: true }).fill(name)
    await page.getByLabel('Weinart').selectOption({ label: wineType })
    await page.getByLabel('Weingut').fill(winery)
    await page.getByLabel('Jahrgang').fill(vintage)
    await page.getByLabel('Geschmacksrichtung').selectOption({ label: sweetness })
    await page.getByLabel('Beschreibung', { exact: true }).fill(description)
    await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
    await expect(page.getByText(name, { exact: true })).toBeVisible()
  }
  // The host always sees the description
  await expect(page.getByText('Mineralisch & spritzig')).toBeVisible()

  // Host rates along and starts right from their waiting page
  await page.getByRole('link', { name: 'Zum Tasting' }).click()
  await page.getByLabel('Wie heißt du?').fill('Gastgeber')
  await page.getByRole('button', { name: 'Beitreten' }).click()
  await expect(page.getByText('Du bist Gastgeber. Starte das Tasting, sobald alle da sind.')).toBeVisible()
  await page.getByRole('button', { name: 'Tasting starten' }).click()
  await expect(page.getByRole('link', { name: /Wein #1/ }).first()).toBeVisible()
  await expect(page.getByRole('link', { name: 'Für Gastgeber' })).toBeVisible()

  // Two guests rate blind – the admin area asks them for the PIN
  const anna = await newGuest(browser, testInfo)
  await joinAs(anna, code, 'Anna')
  await expect(anna.getByText('Riesling')).toHaveCount(0)
  await expect(anna.getByText('trocken')).toHaveCount(0)
  await expect(anna.getByText('Weißwein')).toHaveCount(0)
  await expect(anna.getByText('Loosen')).toHaveCount(0)
  await expect(anna.getByText(/Mineralisch/)).toHaveCount(0)
  await anna.getByRole('link', { name: 'Für Gastgeber' }).click()
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
  await expect(anna.getByText('Loosen')).toHaveCount(0)
  await expect(anna.getByText(/Mineralisch/)).toHaveCount(0)
  // Notes only at the end
  await table.reload()
  await expect(table.getByText('So weit sind wir')).toBeVisible()
  await expect(table.getByText('3 Gäste dabei')).toBeVisible()
  await expect(table.getByText('Riesling')).toHaveCount(0)
  await expect(table.getByText('Loosen')).toHaveCount(0)
  await expect(table.getByText(/Mineralisch/)).toHaveCount(0)
  await expect(table.getByText('Anna')).toHaveCount(0)
  await expect(anna.getByText('Pfirsich, sehr frisch')).toHaveCount(0)

  // Host goes from the guest view back to the admin area and finishes → names appear for Anna
  await page.getByRole('link', { name: 'Für Gastgeber' }).click()
  // While the tasting is running, deleting is locked – reordering still works (poured in another order)
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Wein #1 löschen' })).toBeDisabled()
  await expect(page.getByText(/Umsortieren geht weiter, Löschen nur in der Vorbereitung/)).toBeVisible()
  await page.getByRole('button', { name: 'Wein #1 nach unten' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Spätburgunder' }).getByText('1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Wein #1 nach unten' }).click()
  await expect(page.getByRole('listitem').filter({ hasText: 'Riesling' }).getByText('1', { exact: true })).toBeVisible()
  // … and can get back to their wines at any time during the tasting
  await page.getByRole('link', { name: 'Zum Tasting' }).click()
  await expect(page.getByRole('link', { name: /Wein #1/ }).first()).toBeVisible()
  await page.getByRole('link', { name: 'Für Gastgeber' }).click()
  await page.getByRole('button', { name: 'Tasting beenden & auflösen' }).click()
  await page.getByRole('button', { name: 'Beenden & auflösen' }).click()
  await expect(page.getByText('Beendet', { exact: true }).first()).toBeVisible()
  await expect(anna.getByText('Riesling').first()).toBeVisible({ timeout: 12_000 })
  await expect(anna.getByText('Weingut Dr. Loosen · Weißwein · 2022 · trocken').first()).toBeVisible()
  await expect(anna.getByText('Mineralisch & spritzig').first()).toBeVisible()
  // The table view reveals the podium on its own
  await expect(table.getByText('Endergebnis')).toBeVisible({ timeout: 12_000 })
  await expect(table.getByText('Riesling').first()).toBeVisible()
  // … and the notes, without names
  const notes = anna.getByRole('region', { name: 'Notizen' })
  await expect(notes.getByText('„Pfirsich, sehr frisch“')).toBeVisible()
  await expect(notes.getByText('Anna')).toHaveCount(0)
  await expect(anna.getByText('Endergebnis')).toBeVisible()
})

test('Gäste kommen auch per RSC-Anfrage nicht an die Admin-Daten', async ({ page, browser }, testInfo) => {
  await createTasting(page, 'E2E Geheim')

  // Record a real client navigation by the host (RSC request with router state)
  const captured = page.waitForRequest((r) => r.headers()['rsc'] === '1' && r.url().includes('/admin/wines'))
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  const request = await captured
  await page.getByLabel('Name', { exact: true }).fill('Geheimwein')
  await page.getByLabel('Weinart').selectOption({ label: 'Rotwein' })
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
  const code = await createTasting(page, 'E2E Zweitgerät')
  await addWines(page, ['Riesling'])
  await startTasting(page)

  // The guest phone is in the middle of the tasting and knows the PIN
  const phone = await newGuest(browser, testInfo)
  await joinAs(phone, code, 'Paul')
  await phone.getByRole('link', { name: 'Für Gastgeber' }).click()
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

/** Horizontal finger swipe on the wine heading, as touch pointer events. */
async function swipe(page: Page, fromX: number, toX: number) {
  const target = page.getByRole('heading', { level: 1 })
  const init = { pointerId: 7, pointerType: 'touch', isPrimary: true, clientY: 300 }
  await target.dispatchEvent('pointerdown', { ...init, clientX: fromX })
  for (let i = 1; i <= 6; i++) {
    await target.dispatchEvent('pointermove', { ...init, clientX: fromX + ((toX - fromX) * i) / 6 })
  }
  await target.dispatchEvent('pointerup', { ...init, clientX: toX })
}

test('Gäste wischen zwischen den Weinen, ungespeicherte Sterne halten sie auf', async ({ page, browser }, testInfo) => {
  const code = await createTasting(page, 'E2E Wischen')
  await addWines(page, ['Riesling', 'Silvaner'])
  await startTasting(page)

  const guest = await newGuest(browser, testInfo)
  await joinAs(guest, code, 'Anna')
  await guest.goto(`/tasting/${code}/wine/1`)
  await expect(guest.getByRole('heading', { name: 'Riesling' })).toBeVisible()

  // Left: next wine – right: back again
  await swipe(guest, 320, 60)
  await guest.waitForURL(new RegExp(`/tasting/${code}/wine/2`))
  await expect(guest.getByRole('heading', { name: 'Silvaner' })).toBeVisible()
  await swipe(guest, 60, 320)
  await guest.waitForURL(new RegExp(`/tasting/${code}/wine/1`))
  await expect(guest.getByRole('heading', { name: 'Riesling' })).toBeVisible()

  // Unsaved stars: the swipe springs back and asks to save first
  await guest.getByRole('radio', { name: '4 von 5 Sternen' }).first().click()
  await swipe(guest, 320, 60)
  await expect(guest.getByText('Speichere erst – sonst gehen deine Sterne verloren.')).toBeVisible()
  await expect(guest.getByRole('heading', { name: 'Riesling' })).toBeVisible()
  expect(guest.url()).toMatch(new RegExp(`/tasting/${code}/wine/1`))
})

test('Gastgeber entfernt Teilnehmer und löscht das Tasting', async ({ page, browser }, testInfo) => {
  const code = await createTasting(page, 'E2E Aufräumen')
  await addWines(page, ['Silvaner'])

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
  await expect(blindSwitch).not.toBeChecked()
  await blindSwitch.click()
  await expect(page.getByText('Gespeichert.')).toBeVisible()
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Blindverkostung' })).toBeChecked()

  // Deleting only after typing the code
  const deleteButton = page.getByRole('button', { name: 'Endgültig löschen' })
  await expect(deleteButton).toBeDisabled()
  await page.getByLabel(/Zur Bestätigung den Code/).fill(code.toLowerCase())
  await deleteButton.click()
  await page.waitForURL((url) => url.pathname === '/')
  await expect(page.getByText('Tasting gelöscht.')).toBeVisible()
  await page.goto(`/tasting/${code}`)
  await expect(page.getByRole('heading', { name: 'Tasting nicht gefunden' })).toBeVisible()
})

test('Das Glas oben führt aus der Verwaltung zurück zur Startseite', async ({ page }) => {
  await createTasting(page, 'E2E Kopfzeile')

  // One site header, the admin area is the page's main content
  await expect(page.getByRole('banner')).toHaveCount(1)
  await expect(page.getByRole('main')).toHaveCount(1)

  // Symbol only – the link is found by its accessible name
  const homeLink = page.getByRole('banner').getByRole('link', { name: 'Wine Tasting – zur Startseite' })
  await expect(homeLink).toHaveText('')
  await homeLink.click()
  await page.waitForURL((url) => url.pathname === '/')
  await expect(homeLink).toHaveAttribute('aria-current', 'page')
})

test('unbekannter Code zeigt die Fehlerseite', async ({ page }) => {
  await page.goto('/tasting/222222')
  await expect(page.getByRole('heading', { name: 'Tasting nicht gefunden' })).toBeVisible()
})

// Only talks to the server – one device is enough
test('Sicherheits-Header, robots.txt und App-Icons', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop')

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

test('Beim Erstellen wird die Rechnung des Bewertungssystems erklärt', async ({ page }) => {
  await page.goto('/new')
  await page.getByText('100-Punkte-Schema', { exact: true }).click()
  // Folded away on /new – most hosts don't need the maths
  await expect(page.getByText('Sockel für jeden Wein')).toBeHidden()
  await page.getByText('So wird gerechnet').click()
  await expect(page.getByText('Sockel für jeden Wein')).toBeVisible()
  await expect(page.getByText('20 Punkte', { exact: true })).toBeVisible()
  await expect(page.getByText(/Überall 4 Sterne ergeben 90\./)).toBeVisible()
  await page.getByText('5-Punkte-Schema', { exact: true }).click()
  await expect(page.getByText(/Jedes Kriterium zählt gleich viel/)).toBeVisible()
})
