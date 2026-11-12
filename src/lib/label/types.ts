import type { Sweetness } from '@/lib/tasting/sweetness'
import type { WineType } from '@/lib/tasting/wine-type'

/** One recognized text line from the label photo, with its bounding box in image pixels. */
export type OcrLine = { text: string; confidence: number; bbox: { x0: number; y0: number; x1: number; y1: number } }

/**
 * Where a value comes from when it is not printed as such: `grape` = from the colour of the
 * printed grapes, `origin` = from the appellation (its colour rule or its grapes). Shown with a
 * suggestion ("aus der Rebsorte", "aus der Herkunft"). Absent for values read off the label.
 */
export type GuessSource = 'grape' | 'origin'

/**
 * A guessed field value. `sure` = very likely right: the form may fill it in (marked as read from
 * the label). Not sure = only offered as a suggestion to tap.
 */
export type FieldGuess<T> = { value: T; sure: boolean; from?: GuessSource }

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
  /**
   * Up to 3 typical grapes of the appellation on the label, best first. Never sure and only when
   * no grape is printed; offered "aus der Herkunft".
   */
  grapeCandidates?: string[]
  /** Up to 3 plausible producers to tap, best first; never the filled-in winery. */
  wineryCandidates?: string[]
  /** The wineryCandidates that matched the winery list; shown to the host as "steht in der Weingut-Liste". */
  listedWineries?: string[]
  /**
   * Up to 3 taste lines ("Süß & fruchtig") for the free-text description, best first. Never sure:
   * only offered to tap, never filled in.
   */
  descriptionCandidates?: string[]
}
