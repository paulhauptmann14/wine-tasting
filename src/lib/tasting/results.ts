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

/** Weighted 1–5 score per person for every complete rating (a value for each current criterion). */
export function completePersonScores(
  input: Pick<ResultsInput, 'criteria' | 'ratings'>,
): { participantId: string; wineId: string; score: number; values: Record<string, number> }[] {
  const { criteria } = input
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)
  // Weighted per person, so heavier criteria (e.g. taste) count more – equal weights give the plain mean
  return input.ratings
    .filter((r) => criteria.length > 0 && criteria.every((c) => Number.isFinite(r.values[c.id])))
    .map((r) => ({
      participantId: r.participantId,
      wineId: r.wineId,
      values: r.values,
      score: criteria.reduce((sum, c) => sum + r.values[c.id] * c.weight, 0) / totalWeight,
    }))
}

export function computeResults(input: ResultsInput): Results {
  const criteria = [...input.criteria].sort((a, b) => a.position - b.position)
  const criterionIds = criteria.map((c) => c.id)
  // The shared completeness rule lives in completePersonScores; averages derive from the same rows
  const complete = completePersonScores({ criteria, ratings: input.ratings })

  const perWine: WineResult[] = input.wines.map((w) => {
    const rs = complete.filter((r) => r.wineId === w.id)
    const personScores = rs.map((x) => x.score)
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
      alcohol: input.revealNames ? w.alcohol : null,
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
