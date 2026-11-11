/** Meaning of each step, after the 5-point scheme – so guests know what four stars say. */
const LABELS = ['schwach', 'befriedigend', 'gut', 'sehr gut', 'ausgezeichnet'] as const

export function starLabel(value: number | null, min: number, max: number): string | null {
  if (value === null || max - min + 1 !== LABELS.length) return null
  return LABELS[value - min] ?? null
}
