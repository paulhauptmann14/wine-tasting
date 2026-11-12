import { SCALES, type Scale } from './presets'
import type { WineDetails, WineLike } from './display'

export type ResultsInput = {
  wines: ({ id: string } & WineLike)[]
  criteria: { id: string; name: string; position: number; weight: number }[]
  ratings: { participantId: string; wineId: string; values: Record<string, number> }[]
  revealNames: boolean
}

export type WineResult = {
  wineId: string
  position: number
  label: string
  name: string | null
  score: number | null
  rank: number | null
  ratingCount: number
  criterionAverages: Record<string, number | null>
} & WineDetails

export type Results = {
  criteria: { id: string; name: string; weight: number }[]
  /** Ranked wines descending, then unrated ones by position. */
  wines: WineResult[]
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const EPSILON = 1e-9

export function computeResults(input: ResultsInput): Results {
  const criteria = [...input.criteria].sort((a, b) => a.position - b.position)
  const criterionIds = criteria.map((c) => c.id)
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
  // Weighted per person, so heavier criteria (e.g. taste) count more – equal weights give the plain mean
  const personScore = (values: Record<string, number>) =>
    criteria.reduce((sum, c) => sum + values[c.id] * c.weight, 0) / totalWeight
  const complete = input.ratings.filter(
    (r) => criterionIds.length > 0 && criterionIds.every((id) => Number.isFinite(r.values[id])),
  )

  const perWine: WineResult[] = input.wines.map((w) => {
    const rs = complete.filter((r) => r.wineId === w.id)
    const personScores = rs.map((r) => personScore(r.values))
    return {
      wineId: w.id,
      position: w.position,
      label: `Wein #${w.position}`,
      name: input.revealNames ? w.name : null,
      winery: input.revealNames ? w.winery : null,
      vintage: input.revealNames ? w.vintage : null,
      grapeVariety: input.revealNames ? w.grapeVariety : null,
      sweetness: input.revealNames ? w.sweetness : null,
      wineType: input.revealNames ? w.wineType : null,
      description: input.revealNames ? w.description : null,
      score: rs.length > 0 ? mean(personScores) : null,
      rank: null,
      ratingCount: rs.length,
      criterionAverages: Object.fromEntries(
        criterionIds.map((id) => [id, rs.length > 0 ? mean(rs.map((r) => r.values[id])) : null]),
      ),
    }
  })

  const rated = perWine
    .filter((w) => w.score !== null)
    .sort((a, b) => b.score! - a.score! || a.position - b.position)
  rated.forEach((w, i) => {
    const prev = rated[i - 1]
    w.rank = prev && Math.abs(prev.score! - w.score!) < EPSILON ? prev.rank : i + 1
  })
  const unrated = perWine.filter((w) => w.score === null).sort((a, b) => a.position - b.position)

  return { criteria: criteria.map(({ id, name, weight }) => ({ id, name, weight })), wines: [...rated, ...unrated] }
}

/** Maps the 1–5 star average onto the rating system's scale (5, 20 or 100 points). */
export function toScale(score: number | null, scale: Scale): number | null {
  if (score === null) return null
  const { base, max } = SCALES[scale]
  return base + ((max - base) * score) / 5
}

export function formatScore(value: number | null, scale: Scale = 'five'): string {
  if (value === null) return '–'
  const digits = SCALES[scale].decimals
  return value.toLocaleString('de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

/** A 1–5 star average as the score in the tasting's rating system, e.g. "87" or "4,2". */
export const formatScaled = (score: number | null, scale: Scale) => formatScore(toScale(score, scale), scale)
