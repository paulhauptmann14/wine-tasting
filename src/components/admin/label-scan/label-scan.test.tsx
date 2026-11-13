// @vitest-environment jsdom
import { beforeEach, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { LabelSuggestion } from '@/lib/label/types'
import { stack } from '@/lib/label/test-lines'

vi.mock('@/app/tasting/[code]/admin/actions', () => ({
  addWineAction: vi.fn(),
  deleteWineAction: vi.fn(),
  moveWineAction: vi.fn(),
  updateWineAction: vi.fn(),
  shuffleWinesAction: vi.fn(),
}))

// The OCR engine needs a real browser, and what the parser makes of a label is tested in
// src/lib/label – here the form gets a prepared suggestion
const recognizeLabel = vi.fn()
vi.mock('@/components/admin/label-scan/ocr', async (importOriginal) => ({
  OcrLoadError: (await importOriginal<typeof import('./ocr')>()).OcrLoadError,
  recognizeLabel: (file: Blob, onProgress?: (p: number) => void) => recognizeLabel(file, onProgress),
}))
const parseLabel = vi.fn<(lines: unknown, options?: unknown) => LabelSuggestion>()
vi.mock('@/lib/label/parse-label', () => ({
  parseLabel: (lines: unknown, options?: unknown) => parseLabel(lines, options),
}))
vi.mock('@/components/admin/label-scan/load-reference', () => ({
  loadReference: async () => ({ wineries: ['Weingut Dr. Loosen'], appellations: [], sites: [] }),
}))
vi.stubGlobal(
  'fetch',
  vi.fn(async () => ({ ok: true, json: async () => ['Weingut Dr. Loosen', 'Weingut Egon Müller'] })),
)

import { SCAN_UNSURE_NOTE, WineManager } from '../wine-manager'
import { SCAN_ERROR, SCAN_LOAD_ERROR, SCAN_PRIVACY_NOTE } from './label-scan'
import { OcrLoadError } from './ocr'
import { LABEL_LINES_HEADING, WINERY_LIST_NOTE } from './label-lines'
import { SCAN_MARKER_TEXT } from './scan-fields'

// Brand and name mixed up – the typical hard case: the parser is unsure and offers candidates
const uncertain: LabelSuggestion = {
  name: { value: 'Lacroix Belle', sure: false },
  nameCandidates: ['Camp del Gal'],
  winery: { value: 'Domaine de la Croix', sure: true },
  wineryCandidates: ['Cave Belle'],
  listedWineries: ['Cave Belle'],
  vintage: { value: 2021, sure: true },
  grapeVariety: { value: 'Merlot', sure: true },
  wineType: { value: 'red', sure: false, from: 'grape' },
  sweetness: { value: 'dry', sure: true },
}

const photo = new File(['x'], 'etikett.jpg', { type: 'image/jpeg' })

function setup(suggestion: LabelSuggestion = uncertain) {
  recognizeLabel.mockResolvedValue(stack([['x']]))
  parseLabel.mockReturnValue(suggestion)
  const user = userEvent.setup()
  const { container } = render(<WineManager code="ABC123" wines={[]} locked={false} status="setup" unratedCount={0} />)
  const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!
  const scan = async () => {
    await user.upload(fileInput, photo)
    await screen.findByText(SCAN_UNSURE_NOTE)
  }
  return { user, fileInput, scan }
}

const nameField = () => screen.getByRole('textbox', { name: 'Name' })
const wineryField = () => screen.getByRole('combobox', { name: 'Weingut' })
const linesBlock = () => screen.queryByRole('region', { name: LABEL_LINES_HEADING })
const rows = () => within(linesBlock()!).getAllByRole('listitem')
const assign = (user: ReturnType<typeof userEvent.setup>, text: string, field: 'Name' | 'Weingut') =>
  user.click(screen.getByRole('button', { name: `„${text}“ als ${field} übernehmen` }))
const suggestionsFor = (field: string) => screen.queryByRole('group', { name: `Vorschläge für ${field}` })

beforeEach(() => {
  recognizeLabel.mockReset()
  parseLabel.mockReset()
})

it('offers the scan with the privacy note and opens the system chooser (camera or library)', () => {
  setup()
  const button = screen.getByRole('button', { name: 'Etikett scannen' })
  expect(button).toHaveAccessibleDescription(SCAN_PRIVACY_NOTE)
  const input = document.querySelector('input[type="file"]')!
  expect(input).toHaveAttribute('accept', 'image/*')
  // No `capture`: phones then offer photo library, camera and files instead of the camera only
  expect(input).not.toHaveAttribute('capture')
})

it('shows reading progress and gives the parser the OCR lines and the reference data', async () => {
  let finish: (lines: unknown) => void = () => {}
  recognizeLabel.mockImplementation((_file, onProgress) => {
    onProgress?.(0.4)
    return new Promise((resolve) => (finish = resolve))
  })
  parseLabel.mockReturnValue(uncertain)
  const user = userEvent.setup()
  const { container } = render(<WineManager code="ABC123" wines={[]} locked={false} status="setup" unratedCount={0} />)
  await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, photo)
  await waitFor(() => expect(screen.getByText(/Etikett wird gelesen/)).toHaveTextContent('40 %'))
  // Unavailable while reading, but still focusable, so focus does not drop to <body>
  const button = screen.getByRole('button', { name: 'Etikett scannen' })
  expect(button).toHaveAttribute('aria-disabled', 'true')
  expect(button).not.toBeDisabled()
  button.focus()
  const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!
  const openChooser = vi.spyOn(fileInput, 'click')
  await user.click(button)
  expect(openChooser).not.toHaveBeenCalled()
  expect(button).toHaveFocus()
  const lines = stack([['DR. LOOSEN']])
  finish(lines)
  await screen.findByText(SCAN_UNSURE_NOTE)
  expect(recognizeLabel).toHaveBeenCalledWith(photo, expect.any(Function))
  const [passedLines, options] = parseLabel.mock.calls[0] as [unknown, { appellations: unknown[]; sites: unknown[]; matchWinery: (t: string) => string | null }]
  expect(passedLines).toBe(lines)
  expect(options.appellations).toEqual([])
  expect(options.sites).toEqual([])
  expect(options.matchWinery('Weingut Dr Loosen')).toBe('Weingut Dr. Loosen')
})

it('writes only sure values into the fields and marks them as not guaranteed', async () => {
  const { scan } = setup()
  await scan()

  expect(screen.getByText(SCAN_UNSURE_NOTE).closest('[role="status"]')).not.toBeNull()
  expect(screen.getByRole('combobox', { name: 'Weingut' })).toHaveValue('Domaine de la Croix')
  expect(screen.getByRole('textbox', { name: 'Jahrgang' })).toHaveValue('2021')
  expect(screen.getByRole('textbox', { name: 'Rebsorte' })).toHaveValue('Merlot')
  expect(screen.getByRole('combobox', { name: 'Geschmacksrichtung' })).toHaveValue('dry')
  for (const name of ['Weingut', 'Jahrgang', 'Rebsorte', 'Geschmacksrichtung']) {
    const field = screen.getByRole(name === 'Jahrgang' || name === 'Rebsorte' ? 'textbox' : 'combobox', { name })
    expect(field).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
    // Not color alone: the text above plus a wine-red outline
    expect(field).toHaveClass('border-wine')
  }
  expect(screen.getByRole('button', { name: 'Jahrgang passt' })).toBeInTheDocument()
})

it('keeps uncertain values out of the fields: name and winery lines go to one block, the rest stays a suggestion', async () => {
  const { scan } = setup()
  await scan()

  // Unsure name and the inferred wine type are not written
  expect(nameField()).toHaveValue('')
  expect(nameField()).not.toHaveAccessibleDescription(/bitte prüfen/)
  expect(screen.getByRole('combobox', { name: /Weinart/ })).toHaveValue('')

  // No "Vielleicht" chips under Name and Weingut any more: one block with every line, list hits first
  expect(suggestionsFor('Name')).toBeNull()
  expect(suggestionsFor('Weingut')).toBeNull()
  expect(linesBlock()).toBeInTheDocument()
  expect(rows().map((row) => within(row).getAllByRole('button').map((b) => b.textContent))).toEqual([
    ['Name', 'Weingut'],
    ['Name', 'Weingut'],
    ['Name', 'Weingut'],
  ])
  expect(rows().map((row) => row.querySelector('p')?.textContent)).toEqual(['Cave Belle', 'Lacroix Belle', 'Camp del Gal'])
  // The block sits right below the Name field, above the Weinart field
  expect(nameField().compareDocumentPosition(linesBlock()!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  expect(linesBlock()!.compareDocumentPosition(screen.getByRole('combobox', { name: /Weinart/ })) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()

  expect(within(suggestionsFor('Weinart')!).getByRole('button')).toHaveTextContent('Rotwein (aus der Rebsorte)')
})

it('notes which line is in the winery list, without filling anything in', async () => {
  const { scan } = setup()
  await scan()
  expect(within(rows()[0]).getByText(WINERY_LIST_NOTE)).toBeInTheDocument()
  expect(screen.getAllByText(WINERY_LIST_NOTE)).toHaveLength(1)
  // Not sure, so the winery field keeps what the sure reading put there
  expect(wineryField()).toHaveValue('Domaine de la Croix')
})

it('gives every button a label that names the line and the field', async () => {
  const { scan } = setup()
  await scan()
  for (const text of ['Cave Belle', 'Lacroix Belle', 'Camp del Gal']) {
    expect(screen.getByRole('button', { name: `„${text}“ als Name übernehmen` })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: `„${text}“ als Weingut übernehmen` })).toHaveAttribute('aria-pressed', 'false')
  }
  // 48px tap targets
  expect(screen.getByRole('button', { name: '„Camp del Gal“ als Name übernehmen' })).toHaveClass('h-12', 'min-w-12')
})

it('shows ALL-CAPS lines in readable case and merges duplicates', async () => {
  const { scan } = setup({
    vintage: { value: 2021, sure: true },
    nameCandidates: ['CAMP DEL GAL', 'LA CROIX BELLE'],
    wineryCandidates: ['Camp del gal', 'Cave Belle'],
  })
  await scan()
  expect(rows().map((row) => row.querySelector('p')?.textContent)).toEqual(['Camp del Gal', 'La Croix Belle', 'Cave Belle'])
})

it('writes a line into Name when tapped, marks the field like a scanned value and marks the row', async () => {
  const { user, scan } = setup()
  await scan()

  await assign(user, 'Camp del Gal', 'Name')
  expect(nameField()).toHaveValue('Camp del Gal')
  expect(nameField()).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
  expect(nameField()).toHaveClass('border-wine')
  const row = rows()[2]
  expect(row).toHaveTextContent('→ Name')
  expect(within(row).getByRole('button', { name: '„Camp del Gal“ als Name übernehmen' })).toHaveAttribute('aria-pressed', 'true')
  expect(within(row).getByRole('button', { name: '„Camp del Gal“ als Weingut übernehmen' })).toHaveAttribute('aria-pressed', 'false')
  // The other rows stay as they are
  expect(rows()[0]).not.toHaveTextContent('→')

  await user.click(screen.getByRole('button', { name: 'Rotwein (aus der Rebsorte)' }))
  expect(screen.getByRole('combobox', { name: /Weinart/ })).toHaveValue('red')
  expect(screen.getByRole('combobox', { name: /Weinart/ })).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
  expect(suggestionsFor('Weinart')).toBeNull()
})

it('moves a line to Weingut when reassigned and empties the field it left', async () => {
  const { user, scan } = setup({ nameCandidates: ['Camp del Gal'], vintage: { value: 2021, sure: true } })
  await scan()

  await assign(user, 'Camp del Gal', 'Name')
  expect(nameField()).toHaveValue('Camp del Gal')
  await assign(user, 'Camp del Gal', 'Weingut')
  expect(wineryField()).toHaveValue('Camp del Gal')
  expect(wineryField()).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
  expect(nameField()).toHaveValue('')
  expect(nameField()).not.toHaveAccessibleDescription(/bitte prüfen/)
  expect(nameField()).not.toHaveClass('border-wine')
  expect(rows()[0]).toHaveTextContent('→ Weingut')
  expect(rows()[0]).not.toHaveTextContent('→ Name')
})

it('lets a later tap replace what an earlier tap wrote, and releases the first line', async () => {
  const { user, scan } = setup({ nameCandidates: ['Camp del Gal', 'Lacroix Belle'], vintage: { value: 2021, sure: true } })
  await scan()

  await assign(user, 'Camp del Gal', 'Name')
  await assign(user, 'Lacroix Belle', 'Name')
  expect(nameField()).toHaveValue('Lacroix Belle')
  expect(rows()[0]).not.toHaveTextContent('→')
  expect(rows()[1]).toHaveTextContent('→ Name')
})

it('never overwrites what the host typed: tapping says to clear the field first', async () => {
  const { user, scan } = setup({ nameCandidates: ['Camp del Gal'], vintage: { value: 2021, sure: true } })
  await user.type(nameField(), 'Mein Wein')
  await scan()
  // The block is there even though the field is filled
  expect(linesBlock()).toBeInTheDocument()

  await assign(user, 'Camp del Gal', 'Name')
  expect(nameField()).toHaveValue('Mein Wein')
  expect(screen.getByText('Name ist schon ausgefüllt – erst leeren.')).toBeInTheDocument()
  expect(rows()[0]).not.toHaveTextContent('→')
  expect(nameField()).not.toHaveAccessibleDescription(/bitte prüfen/)

  // Cleared: the same tap works now, and the notice is gone
  await user.clear(nameField())
  await assign(user, 'Camp del Gal', 'Name')
  expect(nameField()).toHaveValue('Camp del Gal')
  expect(screen.queryByText('Name ist schon ausgefüllt – erst leeren.')).toBeNull()
})

it('treats text typed over a tapped line as the host\'s own', async () => {
  const { user, scan } = setup({ nameCandidates: ['Camp del Gal', 'Lacroix Belle'], vintage: { value: 2021, sure: true } })
  await scan()
  await assign(user, 'Camp del Gal', 'Name')
  await user.type(nameField(), ' Reserva')
  expect(nameField()).toHaveValue('Camp del Gal Reserva')
  // The row is released and the typed text is protected
  expect(rows()[0]).not.toHaveTextContent('→')
  await assign(user, 'Lacroix Belle', 'Name')
  expect(nameField()).toHaveValue('Camp del Gal Reserva')
  expect(screen.getByText('Name ist schon ausgefüllt – erst leeren.')).toBeInTheDocument()
})

it('keeps a typed winery when a line is reassigned to it from Name', async () => {
  const { user, scan } = setup({ nameCandidates: ['Camp del Gal'], vintage: { value: 2021, sure: true } })
  await user.type(wineryField(), 'Mein Weingut')
  await scan()
  await assign(user, 'Camp del Gal', 'Name')
  await assign(user, 'Camp del Gal', 'Weingut')
  expect(wineryField()).toHaveValue('Mein Weingut')
  // The move did not happen: the line is still in Name
  expect(nameField()).toHaveValue('Camp del Gal')
  expect(rows()[0]).toHaveTextContent('→ Name')
  expect(screen.getByText('Weingut ist schon ausgefüllt – erst leeren.')).toBeInTheDocument()
})

it('keeps the block, the markers and the Weinart suggestion after a failed submit', async () => {
  const { addWineAction } = await import('@/app/tasting/[code]/admin/actions')
  vi.mocked(addWineAction).mockResolvedValue({
    values: { name: 'Camp del Gal' },
    fieldErrors: { wineType: ['Bitte wählen'] },
  } as never)
  const { user, scan } = setup()
  await scan()
  await assign(user, 'Camp del Gal', 'Name')
  await user.click(screen.getByRole('button', { name: 'Wein hinzufügen' }))
  await waitFor(() => expect(addWineAction).toHaveBeenCalled())
  await waitFor(() => expect(nameField()).toHaveValue('Camp del Gal'))
  expect(linesBlock()).toBeInTheDocument()
  expect(rows()[2]).toHaveTextContent('→ Name')
  expect(nameField()).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
  expect(suggestionsFor('Weinart')).not.toBeNull()
  // The tapped text can still be replaced by another tap
  await assign(user, 'Cave Belle', 'Name')
  expect(nameField()).toHaveValue('Cave Belle')
})

it('lets a tap from a second scan replace text an earlier tap wrote', async () => {
  const { user, fileInput, scan } = setup({ nameCandidates: ['Camp del Gal'], vintage: { value: 2021, sure: true } })
  await scan()
  await assign(user, 'Camp del Gal', 'Name')
  parseLabel.mockReturnValue({ nameCandidates: ['Lacroix Belle'], vintage: { value: 2021, sure: true } })
  await user.upload(fileInput, photo)
  await screen.findByRole('button', { name: '„Lacroix Belle“ als Name übernehmen' })
  await assign(user, 'Lacroix Belle', 'Name')
  expect(nameField()).toHaveValue('Lacroix Belle')
})

it('takes a line out again on a second tap on the pressed button', async () => {
  const { user, scan } = setup({ nameCandidates: ['Camp del Gal'], vintage: { value: 2021, sure: true } })
  await scan()
  await assign(user, 'Camp del Gal', 'Name')
  await assign(user, 'Camp del Gal', 'Name')
  expect(nameField()).toHaveValue('')
  expect(nameField()).not.toHaveAccessibleDescription(/bitte prüfen/)
  expect(rows()[0]).not.toHaveTextContent('→')
  expect(screen.getByRole('button', { name: '„Camp del Gal“ als Name übernehmen' })).toHaveAttribute('aria-pressed', 'false')
})

it('shows the refusal inside the tapped row', async () => {
  const { user, scan } = setup({ nameCandidates: ['Camp del Gal', 'Lacroix Belle'], vintage: { value: 2021, sure: true } })
  await user.type(nameField(), 'Mein Wein')
  await scan()
  await assign(user, 'Lacroix Belle', 'Name')
  expect(within(rows()[1]).getByText('Name ist schon ausgefüllt – erst leeren.')).toBeInTheDocument()
  expect(within(rows()[0]).queryByText('Name ist schon ausgefüllt – erst leeren.')).toBeNull()
})

it('removes the block after a wine was added', async () => {
  const { addWineAction } = await import('@/app/tasting/[code]/admin/actions')
  vi.mocked(addWineAction).mockResolvedValue({ ok: true, values: {} } as never)
  const { user, scan } = setup()
  await scan()
  await assign(user, 'Camp del Gal', 'Name')
  await user.selectOptions(screen.getByRole('combobox', { name: /Weinart/ }), 'red')
  await user.click(screen.getByRole('button', { name: 'Wein hinzufügen' }))
  await waitFor(() => expect(linesBlock()).toBeNull())
  expect(screen.queryByText(SCAN_UNSURE_NOTE)).toBeNull()
})

it('removes the marker when the host edits the field or confirms it with "passt"', async () => {
  const { user, scan } = setup()
  await scan()

  await user.click(screen.getByRole('button', { name: 'Jahrgang passt' }))
  const vintage = screen.getByRole('textbox', { name: 'Jahrgang' })
  expect(vintage).toHaveValue('2021')
  expect(vintage).not.toHaveAccessibleDescription(/bitte prüfen/)
  expect(vintage).not.toHaveClass('border-wine')
  expect(screen.queryByRole('button', { name: 'Jahrgang passt' })).toBeNull()

  const grape = screen.getByRole('textbox', { name: 'Rebsorte' })
  await user.type(grape, ' Cabernet')
  expect(grape).not.toHaveAccessibleDescription(/bitte prüfen/)
  expect(grape).not.toHaveClass('border-wine')

  // Choosing a wine type himself is the host taking over: the suggestion goes away
  await user.selectOptions(screen.getByRole('combobox', { name: /Weinart/ }), 'white')
  expect(suggestionsFor('Weinart')).toBeNull()
})

it('keeps the margin note until every marked field was handled and nothing is left to suggest', async () => {
  const { user, scan } = setup({ vintage: { value: 2021, sure: true }, grapeVariety: { value: 'Riesling', sure: true } })
  await scan()
  await user.click(screen.getByRole('button', { name: 'Jahrgang passt' }))
  expect(screen.getByText(SCAN_UNSURE_NOTE)).toBeInTheDocument()
  await user.type(screen.getByRole('textbox', { name: 'Rebsorte' }), '!')
  expect(screen.queryByText(SCAN_UNSURE_NOTE)).toBeNull()
})

it('with a suggestion only, the margin note points at the suggestion instead of marked fields', async () => {
  const { user, fileInput } = setup({ wineType: { value: 'red', sure: false } })
  await user.upload(fileInput, photo)
  expect(await screen.findByText(/Tipp auf einen Vorschlag/)).toBeInTheDocument()
  expect(screen.queryByText(SCAN_UNSURE_NOTE)).toBeNull()
})

it('offers grapes and a wine type from the appellation, saying where they come from', async () => {
  const { user, fileInput } = setup({ wineType: { value: 'red', sure: false, from: 'origin' }, grapeCandidates: ['Tempranillo', 'Garnacha'] })
  await user.upload(fileInput, photo)
  expect(await screen.findByText(/Tipp auf einen Vorschlag/)).toBeInTheDocument()
  expect(within(suggestionsFor('Weinart')!).getByRole('button')).toHaveTextContent('Rotwein (aus der Herkunft)')
  expect(within(suggestionsFor('Rebsorte')!).getAllByRole('button').map((b) => b.textContent)).toEqual([
    'Tempranillo (aus der Herkunft)',
    'Garnacha (aus der Herkunft)',
  ])
  // Nothing is filled in until the host taps one
  const grape = screen.getByRole('textbox', { name: 'Rebsorte' })
  expect(grape).toHaveValue('')
  await user.click(screen.getByRole('button', { name: 'Tempranillo (aus der Herkunft)' }))
  expect(grape).toHaveValue('Tempranillo')
  expect(grape).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
})

it('with label lines only, the block itself is the message', async () => {
  const { user, fileInput } = setup({ name: { value: 'Camp del Gal', sure: false } })
  await user.upload(fileInput, photo)
  expect(await screen.findByRole('region', { name: LABEL_LINES_HEADING })).toBeInTheDocument()
  expect(screen.queryByText(SCAN_UNSURE_NOTE)).toBeNull()
  expect(screen.queryByText(/Nichts erkannt/)).toBeNull()
  expect(screen.queryByText(/Tipp auf einen Vorschlag/)).toBeNull()
})

it('says so when nothing was found and leaves the form alone', async () => {
  const { user, fileInput } = setup({})
  await user.upload(fileInput, photo)
  expect(await screen.findByText(/Nichts erkannt/)).toBeInTheDocument()
  expect(screen.getByRole('combobox', { name: 'Weingut' })).toHaveValue('')
  expect(screen.queryByText(SCAN_UNSURE_NOTE)).toBeNull()
})

it('reports an unreadable photo and keeps the form usable', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  recognizeLabel.mockRejectedValue(new Error('cannot decode'))
  const user = userEvent.setup()
  const { container } = render(<WineManager code="ABC123" wines={[]} locked={false} status="setup" unratedCount={0} />)
  await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, photo)
  expect(await screen.findByText(SCAN_ERROR)).toHaveClass('text-destructive')
  expect(screen.queryByText(SCAN_LOAD_ERROR)).toBeNull()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Etikett scannen' })).not.toHaveAttribute('aria-disabled'))
  await user.type(nameField(), 'Von Hand')
  expect(nameField()).toHaveValue('Von Hand')
})

it('says the text recognition could not be loaded (not "try another photo") when the engine fails to load', async () => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  recognizeLabel.mockRejectedValue(new OcrLoadError('OCR engine load stalled: no progress for 60000 ms'))
  const user = userEvent.setup()
  const { container } = render(<WineManager code="ABC123" wines={[]} locked={false} status="setup" unratedCount={0} />)
  await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, photo)
  expect(await screen.findByText(SCAN_LOAD_ERROR)).toHaveClass('text-destructive')
  expect(SCAN_LOAD_ERROR).toMatch(/Verbindung/)
  expect(screen.queryByText(SCAN_ERROR)).toBeNull()
  // Trying again is possible right away and starts a new load
  await waitFor(() => expect(screen.getByRole('button', { name: 'Etikett scannen' })).not.toHaveAttribute('aria-disabled'))
  recognizeLabel.mockResolvedValue(stack([['x']]))
  parseLabel.mockReturnValue({ vintage: { value: 2021, sure: true } })
  await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, photo)
  expect(await screen.findByText(SCAN_UNSURE_NOTE)).toBeInTheDocument()
  expect(screen.queryByText(SCAN_LOAD_ERROR)).toBeNull()
})

it('ignores a scan that finishes after the wine was added: the next, empty form stays empty', async () => {
  const { addWineAction } = await import('@/app/tasting/[code]/admin/actions')
  vi.mocked(addWineAction).mockResolvedValue({ ok: true, values: {} } as never)
  let finish: (lines: unknown) => void = () => {}
  recognizeLabel.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
  parseLabel.mockReturnValue({ vintage: { value: 2019, sure: true }, grapeVariety: { value: 'Merlot', sure: true } })
  const user = userEvent.setup()
  const { container } = render(<WineManager code="ABC123" wines={[]} locked={false} status="setup" unratedCount={0} />)
  await user.upload(container.querySelector<HTMLInputElement>('input[type="file"]')!, photo)
  await screen.findByText(/Etikett wird gelesen/)

  // The host gives up on the slow scan, types the wine and saves it
  await user.type(nameField(), 'Handwein')
  await user.selectOptions(screen.getByRole('combobox', { name: /Weinart/ }), 'red')
  await user.click(screen.getByRole('button', { name: 'Wein hinzufügen' }))
  await waitFor(() => expect(nameField()).toHaveValue(''))

  finish(stack([['x']]))
  await waitFor(() => expect(parseLabel).toHaveBeenCalled())
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(screen.getByRole('textbox', { name: 'Jahrgang' })).toHaveValue('')
  expect(screen.getByRole('textbox', { name: 'Rebsorte' })).toHaveValue('')
  expect(screen.queryByText(/bitte prüfen/)).toBeNull()
  expect(screen.queryByText(SCAN_UNSURE_NOTE)).toBeNull()
})

it('lets a second scan replace what the first scan wrote with its own sure values, but never typed or edited text', async () => {
  const { user, fileInput, scan } = setup({
    vintage: { value: 2019, sure: true },
    grapeVariety: { value: 'Merlot', sure: true },
    winery: { value: 'Weingut Eins', sure: true },
    sweetness: { value: 'sweet', sure: false },
  })
  await user.type(nameField(), 'Mein Wein')
  await scan()
  const vintage = screen.getByRole('textbox', { name: 'Jahrgang' })
  const grape = screen.getByRole('textbox', { name: 'Rebsorte' })
  expect(vintage).toHaveValue('2019')
  expect(grape).toHaveValue('Merlot')
  expect(wineryField()).toHaveValue('Weingut Eins')
  expect(suggestionsFor('Geschmacksrichtung')).not.toBeNull()
  // The host fixes the winery himself: from now on it is his text
  await user.clear(wineryField())
  await user.type(wineryField(), 'Weingut Zwei')

  // The back label: a different vintage, no grape, a different winery, and no sweetness at all
  parseLabel.mockReturnValue({
    vintage: { value: 2022, sure: true },
    winery: { value: 'Weingut Drei', sure: true },
    name: { value: 'Etikett-Name', sure: true },
  })
  await user.upload(fileInput, photo)
  await waitFor(() => expect(vintage).toHaveValue('2022'))
  expect(vintage).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
  // Written by the first scan, not found by the second: the labels complement each other, so it
  // stays – still marked for checking
  expect(grape).toHaveValue('Merlot')
  expect(grape).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
  // Edited and typed text stays
  expect(wineryField()).toHaveValue('Weingut Zwei')
  expect(wineryField()).not.toHaveAccessibleDescription(/bitte prüfen/)
  expect(nameField()).toHaveValue('Mein Wein')
  // Suggestions of the first photo are gone
  expect(suggestionsFor('Geschmacksrichtung')).toBeNull()
})

it('keeps a scanned value the host confirmed with "passt" on a second scan', async () => {
  const { user, fileInput, scan } = setup({ vintage: { value: 2019, sure: true }, grapeVariety: { value: 'Merlot', sure: true } })
  await scan()
  await user.click(screen.getByRole('button', { name: 'Jahrgang passt' }))
  parseLabel.mockReturnValue({ vintage: { value: 2022, sure: true }, grapeVariety: { value: 'Riesling', sure: true } })
  await user.upload(fileInput, photo)
  await waitFor(() => expect(screen.getByRole('textbox', { name: 'Rebsorte' })).toHaveValue('Riesling'))
  expect(screen.getByRole('textbox', { name: 'Jahrgang' })).toHaveValue('2019')
})

it('replaces the label lines and suggestions of the first photo on a second scan', async () => {
  const { user, fileInput, scan } = setup({
    nameCandidates: ['Camp del Gal'],
    vintage: { value: 2021, sure: true },
    wineType: { value: 'red', sure: false },
  })
  await scan()
  expect(suggestionsFor('Weinart')).not.toBeNull()
  parseLabel.mockReturnValue({ nameCandidates: ['Lacroix Belle'], vintage: { value: 2021, sure: true } })
  await user.upload(fileInput, photo)
  await screen.findByRole('button', { name: '„Lacroix Belle“ als Name übernehmen' })
  expect(screen.queryByRole('button', { name: '„Camp del Gal“ als Name übernehmen' })).toBeNull()
  expect(suggestionsFor('Weinart')).toBeNull()
})

it('announces what the scan did in the status line', async () => {
  const { scan } = setup()
  await scan()
  // Weingut, Jahrgang, Rebsorte, Geschmacksrichtung; three lines; Rotwein as the only suggestion
  expect(screen.getByText('Etikett gelesen – 4 Felder ausgefüllt, 3 Zeilen zum Zuordnen, 1 Vorschlag').closest('[role="status"]')).not.toBeNull()
})

it('announces only what is there', async () => {
  const { user, fileInput } = setup({ name: { value: 'Camp del Gal', sure: false } })
  await user.upload(fileInput, photo)
  expect(await screen.findByText('Etikett gelesen – 1 Zeile zum Zuordnen')).toBeInTheDocument()
})

it('keeps the vintage of the front label when the back label has none, and says nothing about emptying', async () => {
  const { user, fileInput, scan } = setup({ vintage: { value: 2019, sure: true }, grapeVariety: { value: 'Merlot', sure: true } })
  await scan()
  const vintage = screen.getByRole('textbox', { name: 'Jahrgang' })
  // Back label: winery and sweetness, but no vintage and no grape
  parseLabel.mockReturnValue({ winery: { value: 'Weingut Eins', sure: true }, sweetness: { value: 'dry', sure: true } })
  await user.upload(fileInput, photo)
  expect(await screen.findByText('Etikett gelesen – 2 Felder ausgefüllt')).toBeInTheDocument()
  expect(screen.queryByText(/geleert/)).toBeNull()
  expect(vintage).toHaveValue('2019')
  expect(vintage).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
  expect(screen.getByRole('textbox', { name: 'Rebsorte' })).toHaveValue('Merlot')
  expect(wineryField()).toHaveValue('Weingut Eins')
  // The kept value can still be replaced by a third photo with its own sure vintage
  parseLabel.mockReturnValue({ vintage: { value: 2020, sure: true } })
  await user.upload(fileInput, photo)
  await waitFor(() => expect(vintage).toHaveValue('2020'))
  expect(vintage).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
})

it('keeps the front label value when the back label only guesses, and offers the guess', async () => {
  const { user, fileInput, scan } = setup({ vintage: { value: 2019, sure: true } })
  await scan()
  parseLabel.mockReturnValue({ vintage: { value: 2018, sure: false } })
  await user.upload(fileInput, photo)
  const group = await screen.findByRole('group', { name: 'Vorschläge für Jahrgang' })
  const vintage = screen.getByRole('textbox', { name: 'Jahrgang' })
  expect(vintage).toHaveValue('2019')
  expect(vintage).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
  await user.click(within(group).getByRole('button', { name: '2018' }))
  expect(vintage).toHaveValue('2018')
})

it('lets a line of the next photo replace a name the earlier scan filled but nobody checked', async () => {
  const { user, fileInput, scan } = setup({ name: { value: 'Vorderseite', sure: true } })
  await scan()
  expect(nameField()).toHaveValue('Vorderseite')
  parseLabel.mockReturnValue({ nameCandidates: ['Rückseite'] })
  await user.upload(fileInput, photo)
  await user.click(await screen.findByRole('button', { name: '„Rückseite“ als Name übernehmen' }))
  expect(nameField()).toHaveValue('Rückseite')
  expect(screen.queryByText(/schon ausgefüllt/)).toBeNull()
})

it('still protects a name the host typed from a tap on a label line', async () => {
  const { user, fileInput } = setup({ nameCandidates: ['Rückseite'] })
  await user.type(nameField(), 'Mein Wein')
  await user.upload(fileInput, photo)
  await user.click(await screen.findByRole('button', { name: '„Rückseite“ als Name übernehmen' }))
  expect(nameField()).toHaveValue('Mein Wein')
})

it('does not offer the value a field already holds from the earlier scan as a suggestion', async () => {
  const { user, fileInput, scan } = setup({ vintage: { value: 2019, sure: true } })
  await scan()
  parseLabel.mockReturnValue({ vintage: { value: 2019, sure: false } })
  await user.upload(fileInput, photo)
  expect(await screen.findByText(/Was erkannt wurde, war schon ausgefüllt/)).toBeInTheDocument()
  expect(suggestionsFor('Jahrgang')).toBeNull()
  expect(screen.getByRole('textbox', { name: 'Jahrgang' })).toHaveAccessibleDescription(SCAN_MARKER_TEXT)
})

it('does not count a field as filled when the second scan reads the same value again', async () => {
  const { user, fileInput, scan } = setup({ vintage: { value: 2019, sure: true } })
  await scan()
  parseLabel.mockReturnValue({ vintage: { value: 2019, sure: true }, grapeVariety: { value: 'Merlot', sure: true } })
  await user.upload(fileInput, photo)
  expect(await screen.findByText('Etikett gelesen – 1 Feld ausgefüllt')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Jahrgang' })).toHaveValue('2019')
})

it('gives "passt" a 48px tap target and the suggestions the normal link underline', async () => {
  const { scan } = setup()
  await scan()
  expect(screen.getByRole('button', { name: 'Jahrgang passt' })).toHaveClass('h-12', 'min-w-12', 'justify-center')
  const suggestion = screen.getByRole('button', { name: 'Rotwein (aus der Rebsorte)' })
  expect(suggestion).toHaveClass('decoration-border')
  expect(suggestion).not.toHaveClass('decoration-muted-foreground')
})

it('offers taste lines only as suggestions for Beschreibung and writes one on tap', async () => {
  const { user, scan } = setup({ sweetness: { value: 'sweet', sure: true }, descriptionCandidates: ['Süß & fruchtig'] })
  await scan()
  const description = screen.getByRole('textbox', { name: 'Beschreibung' })
  // Never filled in by the scan, never marked
  expect(description).toHaveValue('')
  expect(screen.queryByRole('button', { name: 'Beschreibung passt' })).toBeNull()
  const group = suggestionsFor('Beschreibung')!
  expect(within(group).getByText('Vielleicht:')).toBeInTheDocument()
  // Not a line to assign to Name or Weingut
  expect(linesBlock()).toBeNull()
  await user.click(within(group).getByRole('button', { name: 'Süß & fruchtig' }))
  expect(description).toHaveValue('Süß & fruchtig')
  expect(suggestionsFor('Beschreibung')).toBeNull()
})

it('never suggests a description over one the host typed', async () => {
  const { user, scan } = setup({ sweetness: { value: 'sweet', sure: true }, descriptionCandidates: ['Süß & fruchtig'] })
  await user.type(screen.getByRole('textbox', { name: 'Beschreibung' }), 'fruchtig')
  await scan()
  expect(screen.getByRole('textbox', { name: 'Beschreibung' })).toHaveValue('fruchtig')
  expect(suggestionsFor('Beschreibung')).toBeNull()
})
