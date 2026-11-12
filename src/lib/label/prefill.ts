import { SWEETNESS_LABELS } from '@/lib/tasting/sweetness'
import { WINE_TYPE_LABELS } from '@/lib/tasting/wine-type'
import { labelLines, type LabelLine } from './lines'
import type { FieldGuess, GuessSource, LabelSuggestion } from './types'

/** Wine form fields a label scan can fill, by their form field name. */
export const PREFILL_FIELDS = ['name', 'wineType', 'winery', 'vintage', 'grapeVariety', 'sweetness', 'description'] as const
export type PrefillField = (typeof PREFILL_FIELDS)[number]

/** A tap-to-apply suggestion: `value` is what goes into the field, `label` what the button says. */
export type PrefillOption = { value: string; label: string; hint?: string }

export type PrefillPlan = {
  /** Values to write – only sure ones, only into fields that are still empty */
  values: Partial<Record<PrefillField, string>>
  /** The fields written above: shown as "vom Etikett – bitte prüfen" until edited or confirmed */
  marked: PrefillField[]
  /** Uncertain values and alternatives, never written automatically; best first, at most MAX_OPTIONS */
  suggestions: Partial<Record<PrefillField, PrefillOption[]>>
  /** Lines of the label the host assigns to Name or Weingut himself (unsure ones, never written) */
  lines: LabelLine[]
  /** Fields the scan found at all, including ones that were already filled in */
  found: number
}

export const MAX_OPTIONS = 3

// Same limits as the wine form (src/lib/validation.ts)
const MAX_LENGTH: Partial<Record<PrefillField, number>> = { name: 80, winery: 80, grapeVariety: 60, description: 200 }
const MIN_VINTAGE = 1900
const MAX_VINTAGE = 2100

function toText(field: PrefillField, value: string | number): string | null {
  if (field === 'vintage') {
    return typeof value === 'number' && Number.isInteger(value) && value >= MIN_VINTAGE && value <= MAX_VINTAGE
      ? String(value)
      : null
  }
  const text = String(value).replace(/\s+/g, ' ').trim()
  if (!text) return null
  const max = MAX_LENGTH[field]
  return max ? text.slice(0, max).trim() : text
}

/** Says where a suggestion comes from when it is not printed on the label as such. */
export const SOURCE_HINTS: Record<GuessSource, string> = { grape: 'aus der Rebsorte', origin: 'aus der Herkunft' }

function optionFor(field: PrefillField, text: string, from?: GuessSource): PrefillOption {
  const label =
    field === 'wineType'
      ? (WINE_TYPE_LABELS[text as keyof typeof WINE_TYPE_LABELS] ?? text)
      : field === 'sweetness'
        ? (SWEETNESS_LABELS[text as keyof typeof SWEETNESS_LABELS] ?? text)
        : text
  return from ? { value: text, label, hint: SOURCE_HINTS[from] } : { value: text, label }
}

/**
 * Decides what a scan does to the form. Only values read with confidence (`sure`) are written, and
 * only into fields that are still empty. Everything uncertain becomes something to tap: unsure
 * guesses a suggestion under their field, the name and winery candidates a list of label lines the
 * host assigns himself (on many labels it is unclear which line is the name and which the winery). Fields the host already filled get
 * neither, so a scan never overwrites or second-guesses typed text.
 */
export function planPrefill(
  suggestion: LabelSuggestion,
  current: Partial<Record<PrefillField, string>>,
): PrefillPlan {
  const plan: PrefillPlan = { values: {}, marked: [], suggestions: {}, lines: labelLines(suggestion), found: 0 }
  const candidates: Partial<Record<PrefillField, string[]>> = {
    name: suggestion.nameCandidates,
    winery: suggestion.wineryCandidates,
    // Taste lines are never sure: candidates only, so they are never written
    description: suggestion.descriptionCandidates,
    // Typical grapes of the appellation: never sure either
    grapeVariety: suggestion.grapeCandidates,
  }
  // Candidates come from the label, except the appellation's grapes
  const candidateSource: Partial<Record<PrefillField, GuessSource>> = { grapeVariety: 'origin' }
  for (const field of PREFILL_FIELDS) {
    const guess: FieldGuess<string | number> | undefined = field === 'description' ? undefined : suggestion[field]
    const guessText = guess ? toText(field, guess.value) : null
    const candidateTexts = (candidates[field] ?? []).map((c) => toText(field, c)).filter((t): t is string => t !== null)
    if (guessText === null && candidateTexts.length === 0) continue
    plan.found++
    if (current[field]?.trim()) continue

    const writes = guessText !== null && guess?.sure === true
    if (writes) {
      plan.values[field] = guessText
      plan.marked.push(field)
    }
    // Name and winery: only sure values are written, the rest is in `lines`
    if (field === 'name' || field === 'winery') continue
    const texts = [
      ...(guessText !== null && !writes ? [{ text: guessText, from: guess?.from }] : []),
      ...candidateTexts.map((text) => ({ text, from: candidateSource[field] })),
    ]
    const taken = new Set(writes ? [guessText.toLowerCase()] : [])
    const options: PrefillOption[] = []
    for (const { text, from } of texts) {
      const key = text.toLowerCase()
      if (taken.has(key)) continue
      taken.add(key)
      options.push(optionFor(field, text, from))
      if (options.length === MAX_OPTIONS) break
    }
    if (options.length > 0) plan.suggestions[field] = options
  }
  return plan
}

/** Status line after a scan; empty when the margin note above the form already says what happened. */
export function prefillMessage(plan: PrefillPlan): string {
  if (plan.marked.length > 0 || plan.lines.length > 0 || Object.keys(plan.suggestions).length > 0) return ''
  if (plan.found > 0) return 'Was erkannt wurde, war schon ausgefüllt. Nichts geändert.'
  return 'Nichts erkannt. Fotografier das Etikett gerade und formatfüllend – oder trag die Angaben selbst ein.'
}
