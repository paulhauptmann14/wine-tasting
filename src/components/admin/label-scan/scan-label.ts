import { parseLabel } from '@/lib/label/parse-label'
import type { LabelSuggestion } from '@/lib/label/types'
import { matchWinery } from '@/lib/wineries/match'
import { loadReference } from './load-reference'
import { recognizeLabel } from './ocr'

export { OcrLoadError } from './ocr'

/**
 * Photo → field suggestions, entirely in the browser. Loaded with a dynamic import only when the
 * host picks a photo, so tesseract.js and the parser dictionaries stay out of the page bundle.
 * The reference lists (wineries, appellations, vineyard sites) load next to the OCR run.
 * Rejects with an `OcrLoadError` when the OCR engine cannot be loaded.
 */
export async function scanLabel(file: File | Blob, onProgress?: (p: number) => void): Promise<LabelSuggestion> {
  const [lines, reference] = await Promise.all([recognizeLabel(file, onProgress), loadReference()])
  const { wineries, appellations, sites } = reference
  return parseLabel(lines, {
    matchWinery: wineries.length > 0 ? (text) => matchWinery(text, wineries) : undefined,
    appellations,
    sites,
  })
}
