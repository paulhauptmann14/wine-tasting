import { readableCase } from './readable-case'
import type { LabelSuggestion } from './types'

/** One line found on the label, for the host to assign to Name or Weingut. */
export type LabelLine = {
  /** In readable case: this is what goes into the field */
  text: string
  /** The line matched the winery list (but was not sure enough to fill in) */
  inWineryList: boolean
}

export const MAX_LINES = 5
// Same limit as the name and winery fields (src/lib/validation.ts)
const MAX_LENGTH = 80

const tidy = (text: string) => readableCase(text).slice(0, MAX_LENGTH).trim()
/** Case- and space-insensitive identity of a line. */
export const lineKey = (text: string) => text.toLocaleLowerCase().replace(/\s+/g, '')

/**
 * The lines the parser could not place: producers from the winery list first, then name
 * candidates, then other producer guesses – each once, at most MAX_LINES. Sure name and winery
 * values are not here, they go straight into their fields.
 */
export function labelLines(suggestion: LabelSuggestion): LabelLine[] {
  const listed = new Set((suggestion.listedWineries ?? []).map((t) => lineKey(tidy(t))))
  const wineryCandidates = suggestion.wineryCandidates ?? []
  const isListed = (text: string) => listed.has(lineKey(text))
  const unsure = (guess?: { value: string; sure: boolean }) => (guess && !guess.sure ? [guess.value] : [])
  const ordered = [
    ...wineryCandidates.filter((t) => isListed(tidy(t))),
    ...unsure(suggestion.winery),
    ...unsure(suggestion.name),
    ...(suggestion.nameCandidates ?? []),
    ...wineryCandidates.filter((t) => !isListed(tidy(t))),
  ]
  const taken = new Set(
    [suggestion.name, suggestion.winery].flatMap((guess) => (guess?.sure ? [lineKey(tidy(guess.value))] : [])),
  )
  const lines: LabelLine[] = []
  for (const raw of ordered) {
    const text = tidy(raw)
    const key = lineKey(text)
    if (!key || taken.has(key)) continue
    taken.add(key)
    lines.push({ text, inWineryList: isListed(text) })
    if (lines.length === MAX_LINES) break
  }
  return lines
}
