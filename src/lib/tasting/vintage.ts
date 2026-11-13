/** Vintage range of the wine form and the label scan – one place, without zod (the scan chunk imports it). */
export const MIN_VINTAGE = 1900
export const MAX_VINTAGE = 2100

/** A whole year within MIN_VINTAGE–MAX_VINTAGE. */
export function isVintage(value: number): boolean {
  return Number.isInteger(value) && value >= MIN_VINTAGE && value <= MAX_VINTAGE
}
