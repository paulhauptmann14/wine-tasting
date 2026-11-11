import { expect, test, type Page } from '@playwright/test'
import { addWines, createTasting, joinAs, newGuest, startTasting } from './helpers'

/** Sets the same number of stars in every criterion row of the open wine page. */
async function rateAll(page: Page, stars: number) {
  const groups = page.getByRole('radiogroup')
  for (let g = 0; g < (await groups.count()); g++) {
    await groups.nth(g).getByRole('radio', { name: `${stars} von 5 Sternen` }).click()
  }
}

test('Gäste sehen nach dem Speichern, dass es geklappt hat, und was danach kommt', async ({ page, browser }, testInfo) => {
  const code = await createTasting(page, 'E2E Gespeichert')
  await addWines(page, ['Riesling', 'Silvaner'])
  await startTasting(page)

  const guest = await newGuest(browser, testInfo)
  await joinAs(guest, code, 'Anna')
  await guest.goto(`/tasting/${code}/wine/1`)
  await expect(guest.getByText('0 / 2 bewertet')).toBeVisible()

  await rateAll(guest, 4)
  await guest.getByRole('button', { name: 'Speichern & weiter' }).click()
  await expect(guest.getByRole('heading', { name: 'Silvaner' })).toBeVisible()
  await expect(guest.getByRole('status').filter({ hasText: 'Wein #1 gespeichert.' })).toBeVisible()
  await expect(guest.getByText('1 / 2 bewertet')).toBeVisible()

  await rateAll(guest, 5)
  await guest.getByRole('button', { name: 'Speichern & fertig' }).click()
  await expect(guest.getByRole('status').filter({ hasText: 'Wein #2 gespeichert.' })).toBeVisible()
  await expect(guest.getByText('Alles bewertet. Das Ergebnis steht fest, wenn der Gastgeber beendet.')).toBeVisible()
})

test('Fehlende Sterne werden benannt, markiert und angesteuert', async ({ page, browser }, testInfo) => {
  const code = await createTasting(page, 'E2E Fehlt')
  await addWines(page, ['Riesling'])
  await startTasting(page)

  const guest = await newGuest(browser, testInfo)
  await joinAs(guest, code, 'Anna')
  await guest.goto(`/tasting/${code}/wine/1`)

  // Only the first row gets stars – the others are missing
  const groups = guest.getByRole('radiogroup')
  await groups.first().getByRole('radio', { name: '4 von 5 Sternen' }).click()
  await guest.getByRole('button', { name: 'Speichern & fertig' }).click()

  await expect(guest.getByText(/Bei .+ fehlen? noch Sterne\./)).toBeVisible()
  await expect(guest.getByText('fehlt', { exact: true }).first()).toBeVisible()
  // Focus lands on the first row that is still empty, not on the one already rated
  await expect(groups.nth(1).getByRole('radio').first()).toBeFocused()
})

test('Ungespeicherte Sterne: erst der Hinweis, beim zweiten Tippen geht es weiter', async ({ page, browser }, testInfo) => {
  const code = await createTasting(page, 'E2E Ringleiste')
  await addWines(page, ['Riesling', 'Silvaner'])
  await startTasting(page)

  const guest = await newGuest(browser, testInfo)
  await joinAs(guest, code, 'Anna')
  await guest.goto(`/tasting/${code}/wine/1`)
  await guest.getByRole('radio', { name: '4 von 5 Sternen' }).first().click()

  // Ring strip on phones, wine list beside the page on laptops: either way a link to wine #2
  const toSecond = guest.getByRole('link', { name: /Silvaner/ })
  await toSecond.click()
  await expect(guest.getByText('Speichere erst – sonst gehen deine Sterne verloren.')).toBeVisible()
  await expect(guest.getByRole('heading', { name: 'Riesling' })).toBeVisible()
  expect(guest.url()).toMatch(new RegExp(`/tasting/${code}/wine/1`))

  await toSecond.click()
  await guest.waitForURL(new RegExp(`/tasting/${code}/wine/2`))
  await expect(guest.getByRole('heading', { name: 'Silvaner' })).toBeVisible()
})

test('Gast, der mitten im Bewerten vom Ende überrascht wird, bekommt eine Erklärung', async ({ page, browser }, testInfo) => {
  const code = await createTasting(page, 'E2E Ende')
  await addWines(page, ['Riesling'])
  await startTasting(page)

  const guest = await newGuest(browser, testInfo)
  await joinAs(guest, code, 'Anna')
  await guest.goto(`/tasting/${code}/wine/1`)
  await rateAll(guest, 4)

  // The host ends the tasting while the guest is still on the wine page
  await page.getByRole('button', { name: /Tasting beenden/ }).click()
  await page.getByRole('button', { name: /^Beenden/ }).click()
  await expect(page.getByText('Beendet', { exact: true }).first()).toBeVisible()

  await guest.getByRole('button', { name: 'Speichern & fertig' }).click()
  await guest.waitForURL(/\/results\?ended=1/)
  await expect(guest.getByText('Das Tasting ist beendet – hier ist das Ergebnis.')).toBeVisible()
})
