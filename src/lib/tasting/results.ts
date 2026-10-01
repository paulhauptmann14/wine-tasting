export type ResultsInput = {
  wines: { id: string; position: number; name: string; vintage: number | null; grapeVariety: string | null }[]
  criteria: { id: string; name: string; position: number }[]
  ratings: { participantId: string; wineId: string; values: Record<string, number> }[]
  revealNames: boolean
}

export type WineResult = {
  wineId: string
  position: number
  label: string
  name: string | null
  vintage: number | null
  grapeVariety: string | null
  score: number | null
  rank: number | null
  ratingCount: number
  criterionAverages: Record<string, number | null>
}

export type Results = {
  criteria: { id: string; name: string }[]
  /** Gerankte Weine absteigend, danach unbewertete nach Position. */
  wines: WineResult[]
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const EPSILON = 1e-9

export function computeResults(input: ResultsInput): Results {
  const criteria = [...input.criteria].sort((a, b) => a.position - b.position)
  const criterionIds = criteria.map((c) => c.id)
  const complete = input.ratings.filter(
    (r) => criterionIds.length > 0 && criterionIds.every((id) => Number.isFinite(r.values[id])),
  )

  const perWine: WineResult[] = input.wines.map((w) => {
    const rs = complete.filter((r) => r.wineId === w.id)
    const personScores = rs.map((r) => mean(criterionIds.map((id) => r.values[id])))
    return {
      wineId: w.id,
      position: w.position,
      label: `Wein #${w.position}`,
      name: input.revealNames ? w.name : null,
      vintage: input.revealNames ? w.vintage : null,
      grapeVariety: input.revealNames ? w.grapeVariety : null,
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

  return { criteria: criteria.map(({ id, name }) => ({ id, name })), wines: [...rated, ...unrated] }
}

export function formatScore(value: number | null): string {
  if (value === null) return '–'
  return value.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}
