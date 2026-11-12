import { expect, test, type Page } from '@playwright/test'
import { createTasting } from './helpers'

/** Draws a clean label in the browser and returns it as JPEG bytes – no fixture file needed. */
async function renderLabel(page: Page): Promise<Buffer> {
  const dataUrl = await page.evaluate(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 900
    canvas.height = 1200
    const g = canvas.getContext('2d')!
    g.fillStyle = '#f6f1e4'
    g.fillRect(0, 0, canvas.width, canvas.height)
    g.fillStyle = '#222'
    g.textAlign = 'center'
    const text = (font: string, value: string, y: number) => {
      g.font = font
      g.fillText(value, 450, y)
    }
    text('bold 56px Georgia, serif', 'WEINGUT DR. LOOSEN', 220)
    text('bold 110px Georgia, serif', 'Blauschiefer', 480)
    text('72px Georgia, serif', 'Riesling', 640)
    text('60px Georgia, serif', '2021', 780)
    text('54px Georgia, serif', 'trocken', 900)
    text('28px Arial, sans-serif', '12,5 % vol · 750 ml', 1080)
    return canvas.toDataURL('image/jpeg', 0.9)
  })
  return Buffer.from(dataUrl.split(',')[1], 'base64')
}

async function pickPhoto(page: Page, buffer: Buffer) {
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Etikett scannen' }).click()
  await (await chooser).setFiles({ name: 'etikett.jpg', mimeType: 'image/jpeg', buffer })
}

test('Etikett scannen füllt sichere Felder markiert vor und bietet den Rest als Vorschlag an', async ({ page }) => {
  const foreign: string[] = []
  page.on('request', (request) => {
    // blob:/data: URLs are local (the OCR worker starts from a blob)
    const url = new URL(request.url())
    if (/^(https?|wss?):$/.test(url.protocol) && url.hostname !== 'localhost') foreign.push(request.url())
  })
  await createTasting(page, 'E2E Etikett')
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  await expect(page.getByText('Das Foto bleibt auf deinem Gerät.', { exact: false })).toBeVisible()

  // What the host already typed stays
  await page.getByLabel('Weingut', { exact: true }).fill('Mein Weingut')
  await pickPhoto(page, await renderLabel(page))

  // Real OCR in the browser: the first run loads the engine from public/tesseract
  await expect(page.getByText('Vom Etikett gelesen – das kann falsch sein.', { exact: false })).toBeVisible({
    timeout: 45_000,
  })
  await expect(page.getByText(/^Etikett gelesen – \d+ Felder ausgefüllt/)).toBeVisible()
  await expect(page.getByLabel('Weingut', { exact: true })).toHaveValue('Mein Weingut')
  await expect(page.getByLabel('Jahrgang', { exact: true })).toHaveValue('2021')
  await expect(page.getByLabel('Rebsorte', { exact: true })).toHaveValue('Riesling')
  await expect(page.getByLabel('Geschmacksrichtung', { exact: true })).toHaveValue('dry')
  // Filled from the label: marked as "bitte prüfen"
  await expect(page.getByLabel('Jahrgang', { exact: true })).toHaveAccessibleDescription('vom Etikett – bitte prüfen')
  await expect(page.getByLabel('Name', { exact: true })).not.toHaveAccessibleDescription(/bitte prüfen/)
  // A name read from the photo is not certain: it is offered, not written (no appellation on this label)
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('')
  // Lines found on the label go into one block; the host says whether each is the name or the winery
  const lines = page.getByRole('region', { name: 'Auf dem Etikett gefunden – tipp an, wohin es gehört:' })
  await expect(lines).toBeVisible()
  await expect(page.getByRole('group', { name: 'Vorschläge für Name' })).toHaveCount(0)
  // The typed winery is protected
  await lines.getByRole('button', { name: /als Weingut übernehmen/ }).first().click()
  await expect(page.getByText('Weingut ist schon ausgefüllt – erst leeren.')).toBeVisible()
  await expect(page.getByLabel('Weingut', { exact: true })).toHaveValue('Mein Weingut')
  // Assign "Blauschiefer" to the name
  const asName = lines.getByRole('button', { name: /Blauschiefer.*als Name übernehmen/i })
  await asName.click()
  await expect(asName).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(/blauschiefer/i)
  await expect(page.getByLabel('Name', { exact: true })).toHaveAccessibleDescription('vom Etikett – bitte prüfen')
  // A second tap takes it out again, a third puts it back
  await asName.click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue('')
  await asName.click()
  await expect(page.getByLabel('Name', { exact: true })).toHaveValue(/blauschiefer/i)

  // Confirming removes the marker
  await page.getByRole('button', { name: 'Jahrgang passt' }).click()
  await expect(page.getByLabel('Jahrgang', { exact: true })).not.toHaveAccessibleDescription(/bitte prüfen/)

  // Riesling is a white grape, but the type is only inferred: offered, not written
  await expect(page.getByLabel('Weinart', { exact: true })).toHaveValue('')
  await page.getByRole('button', { name: 'Weißwein (aus der Rebsorte)' }).click()
  await expect(page.getByLabel('Weinart', { exact: true })).toHaveValue('white')

  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await expect(page.getByText(/Mein Weingut · Weißwein · 2021/)).toBeVisible()
  // The next wine starts clean
  await expect(page.getByText('Vom Etikett gelesen')).toHaveCount(0)
  await expect(page.getByText('Auf dem Etikett gefunden')).toHaveCount(0)
  await expect(page.getByText(/bitte prüfen/)).toHaveCount(0)
  expect(foreign).toEqual([])
})

test('Wenn die Texterkennung nicht lädt, bleibt das Formular nutzbar', async ({ page }) => {
  await page.route('**/tesseract/**', (route) => route.abort())
  await createTasting(page, 'E2E Etikett Fehler')
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  await pickPhoto(page, Buffer.from('not an image'))

  // A network problem, not the photo: the message says so
  await expect(page.getByText('Die Texterkennung ließ sich nicht laden.', { exact: false })).toBeVisible({ timeout: 30_000 })
  await expect(page.getByText('Das Etikett ließ sich nicht lesen.', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Etikett scannen' })).not.toHaveAttribute('aria-disabled')
  await page.getByLabel('Name', { exact: true }).fill('Von Hand')
  await page.getByLabel('Weinart', { exact: true }).selectOption({ label: 'Rotwein' })
  await page.getByRole('button', { name: 'Wein hinzufügen' }).click()
  await expect(page.getByText('Von Hand', { exact: true })).toBeVisible()
})

test('Ein unlesbares Foto meldet „anderes Foto versuchen“, nicht die Verbindung', async ({ page }) => {
  await createTasting(page, 'E2E Etikett Foto')
  await page.getByRole('link', { name: 'Weine', exact: true }).click()
  // The engine loads fine; the file is not an image, so decoding fails
  await pickPhoto(page, Buffer.from('not an image'))

  await expect(page.getByText('Das Etikett ließ sich nicht lesen.', { exact: false })).toBeVisible({ timeout: 45_000 })
  await expect(page.getByText('Die Texterkennung ließ sich nicht laden.', { exact: false })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Etikett scannen' })).not.toHaveAttribute('aria-disabled')
})
