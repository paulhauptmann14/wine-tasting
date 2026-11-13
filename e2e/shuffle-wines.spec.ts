import type { Page } from '@playwright/test'
import { expect, test } from './fixtures'
import { addWines, createTasting, joinAs, rateAll, startTasting } from './helpers'

const WINES = ['Riesling', 'Silvaner', 'Merlot', 'Syrah']

/** The wines of the admin list as shown: [number, name] per row, top to bottom. */
async function readOrder(page: Page): Promise<[number, string][]> {
  const rows = page.getByRole('list').filter({ hasText: WINES[0] }).getByRole('listitem')
  const texts = await rows.allInnerTexts()
  return texts.map((text) => {
    const [number, name] = text.split('\n').map((line) => line.trim()).filter(Boolean)
    return [Number(number), name]
  })
}

const shuffleButton = (page: Page) => page.getByRole('button', { name: 'Reihenfolge mischen' })

test('Reihenfolge mischen in der Vorbereitung ändert die Reihenfolge und behält die Nummern 1 bis 4', async ({ page }) => {
  await createTasting(page, 'E2E Mischen')
  await addWines(page, WINES)
  const before = await readOrder(page)
  expect(before.map(([, name]) => name)).toEqual(WINES)

  await shuffleButton(page).click()
  await expect(page.getByRole('status').filter({ hasText: /^Neu: 1 .*, 4 / })).toBeVisible()

  await expect.poll(async () => (await readOrder(page)).map(([, name]) => name)).not.toEqual(WINES)
  const after = await readOrder(page)
  expect(after.map(([number]) => number)).toEqual([1, 2, 3, 4])
  expect(after.map(([, name]) => name).sort()).toEqual([...WINES].sort())
})

test('Mischen während des Tastings lässt bewertete Weine auf ihrer Nummer', async ({ page, newGuest }) => {
  const code = await createTasting(page, 'E2E Mischen läuft')
  await addWines(page, WINES)
  await startTasting(page)

  // A guest rates wine #1 (open tasting: the guest page shows the name)
  const guest = await newGuest()
  await joinAs(guest, code, 'Anna')
  await guest.goto(`/tasting/${code}/wine/1`)
  await rateAll(guest, 4)
  await guest.getByRole('button', { name: 'Speichern & weiter' }).click()
  await expect(guest).toHaveURL(/\/wine\/2/)

  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  await expect(page.getByText('Mischt nur Weine, die noch niemand bewertet hat.')).toBeVisible()
  const before = await readOrder(page)
  const [, ratedName] = before[0]

  await shuffleButton(page).click()
  await expect(page.getByRole('status').filter({ hasText: /^Neu: 1 .*, 4 / })).toBeVisible()

  await expect
    .poll(async () => (await readOrder(page)).slice(1).map(([, name]) => name))
    .not.toEqual(before.slice(1).map(([, name]) => name))
  const after = await readOrder(page)
  expect(after[0]).toEqual([1, ratedName])
  expect(after.map(([number]) => number)).toEqual([1, 2, 3, 4])
  expect(after.map(([, name]) => name).sort()).toEqual([...WINES].sort())
})

test('Mischen ist gesperrt, solange weniger als zwei Weine unbewertet sind', async ({ page }) => {
  await createTasting(page, 'E2E Mischen leer')
  await addWines(page, ['Riesling'])
  await expect(shuffleButton(page)).toBeDisabled()
  await expect(page.getByText('Zum Mischen braucht es mindestens zwei Weine ohne Bewertung.')).toBeVisible()
})
