import { SCALES, type Scale } from './presets'

export type Scoring = {
  scale: Scale
  max: number
  /** Points every wine starts with (Parker: 50) */
  base: number
  equalWeights: boolean
  /** points = the criterion's maximum in this tasting; share = its part of the criteria points */
  criteria: { name: string; points: number; share: number }[]
}

/** What each criterion is worth – mirrors computeResults() + toScale(), for explaining the score. */
export function scoring(scale: Scale, criteria: readonly { name: string; weight: number }[]): Scoring {
  const { base, max } = SCALES[scale]
  const total = criteria.reduce((sum, c) => sum + c.weight, 0)
  return {
    scale,
    max,
    base,
    equalWeights: criteria.every((c) => c.weight === criteria[0]?.weight),
    criteria: criteria.map((c) => ({
      name: c.name,
      share: total ? c.weight / total : 0,
      points: total ? ((max - base) * c.weight) / total : 0,
    })),
  }
}

export const formatPoints = (value: number) => value.toLocaleString('de-DE', { maximumFractionDigits: 1 })
