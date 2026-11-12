/** Alcohol by volume in % – 0 for alcohol-free, fortified wines reach about 22. */
export const MIN_ALCOHOL = 0
export const MAX_ALCOHOL = 25

const NUMBER = /^(\d{1,2})(?:[.,](\d+))?$/

/**
 * "13,5", "13.5" or "13,5 % vol" → 13.5, rounded to one decimal; NaN for anything else or outside
 * 0–25. Empty input is the caller's business (optional field).
 */
export function parseAlcoholText(text: string): number {
  const match = NUMBER.exec(text.trim().replace(/\s*%\s*(vol\.?)?$/i, '').trim())
  if (!match) return Number.NaN
  const value = Math.round(Number(`${match[1]}.${match[2] ?? '0'}`) * 10) / 10
  return value >= MIN_ALCOHOL && value <= MAX_ALCOHOL ? value : Number.NaN
}

const decimal = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 1 })

/** "13,5 % vol" – as on the label. */
export function formatAlcohol(value: number): string {
  return `${decimal.format(value)} % vol`
}

/** The form field's text: "13,5", empty when unknown. */
export function alcoholInput(value: number | null | undefined): string {
  return value == null ? '' : decimal.format(value)
}
