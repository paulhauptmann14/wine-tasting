import type { Sweetness } from '@/lib/tasting/sweetness'
import type { WineType } from '@/lib/tasting/wine-type'

/** One recognized text line from the label photo, with its bounding box in image pixels. */
export type OcrLine = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }

/**
 * A guessed field value. `sure` = very likely right: the form may fill it in (marked as read from
 * the label). Not sure = only offered as a suggestion to tap.
 */
export type FieldGuess<T> = { value: T; sure: boolean }

export type LabelSuggestion = {
  /** Only set when sure (an appellation or vineyard site from the reference lists). */
  name?: FieldGuess<string>
  /** Only set when sure (a strong hit in the winery list). */
  winery?: FieldGuess<string>
  vintage?: FieldGuess<number>
  grapeVariety?: FieldGuess<string>
  wineType?: FieldGuess<WineType>
  sweetness?: FieldGuess<Sweetness>
  /** Up to 3 plausible names to tap, best first; never the filled-in name. */
  nameCandidates?: string[]
  /** Up to 3 plausible producers to tap, best first; never the filled-in winery. */
  wineryCandidates?: string[]
  /** The wineryCandidates that matched the winery list; shown to the host as "steht in der Weingut-Liste". */
  listedWineries?: string[]
}
