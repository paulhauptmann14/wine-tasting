import { completePersonScores, type Results, type ResultsInput } from './results'

/** A difference of at least this many stars (1–5 basis) counts as "clearly". */
export const DISTINCT_DIFFERENCE = 1
/** Spread (most controversial / most united) needs at least this many complete ratings per wine. */
export const MIN_SPREAD_RATINGS = 3

export type ReviewRow = { position: number; name: string; mine: number; others: number | null }
export type SpreadWine = { position: number; name: string; min: number; max: number }
export type Review = {
  personal: {
    rows: ReviewRow[]
    favorite: { name: string; groupRank: number | null }
    above: ReviewRow | null
    below: ReviewRow | null
  } | null
  controversial: SpreadWine | null
  consensus: SpreadWine | null
}

const EPSILON = 1e-9
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const deviation = (xs: number[]) => {
  const m = mean(xs)
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)))
}

/**
 * Personal comparison and group spread, all on the 1–5 basis. Holds the viewer's own scores and group
 * figures; the spread shows unnamed extremes (min/max), never a score tied to a guest. The mean of the
 * others can equal one guest's score when only one other rated – an accepted trade-off.
 * Wine names come from the (possibly redacted) results, never from the raw input, so a blind tasting
 * stays blind whatever the caller does.
 */
export function computeReview(
  input: Omit<ResultsInput, 'revealNames'>,
  results: Results,
  viewerId: string | null,
): Review | null {
  const scores = completePersonScores(input)
  const byPosition = [...input.wines].sort((a, b) => a.position - b.position)
  const rankOf = new Map(results.wines.map((w) => [w.wineId, w.rank]))
  const nameOf = new Map(results.wines.map((w) => [w.wineId, w.name ?? w.label]))

  const rows = byPosition.flatMap((w): (ReviewRow & { wineId: string })[] => {
    const mine = scores.find((s) => s.participantId === viewerId && s.wineId === w.id)
    if (!mine) return []
    const others = scores.filter((s) => s.wineId === w.id && s.participantId !== viewerId).map((s) => s.score)
    return [{ wineId: w.id, position: w.position, name: nameOf.get(w.id) ?? `Wein #${w.position}`, mine: mine.score, others: others.length > 0 ? mean(others) : null }]
  })

  // Largest difference of at least DISTINCT_DIFFERENCE; ties keep the lower position
  const pick = (sign: 1 | -1) => {
    let best: (typeof rows)[number] | null = null
    let bestDelta = DISTINCT_DIFFERENCE - EPSILON
    for (const row of rows) {
      if (row.others === null) continue
      const delta = sign * (row.mine - row.others)
      if (delta > bestDelta + EPSILON || (best === null && delta >= bestDelta)) {
        best = row
        bestDelta = delta
      }
    }
    return best
  }
  const strip = (row: (typeof rows)[number] | null): ReviewRow | null =>
    row && { position: row.position, name: row.name, mine: row.mine, others: row.others }

  let personal: Review['personal'] = null
  if (rows.length > 0) {
    // Highest own score; a tie goes to the better group rank, then the lower position
    const favorite = rows.reduce((best, row) => {
      if (row.mine > best.mine + EPSILON) return row
      if (row.mine < best.mine - EPSILON) return best
      const rankRow = rankOf.get(row.wineId) ?? Infinity
      const rankBest = rankOf.get(best.wineId) ?? Infinity
      return rankRow < rankBest ? row : best
    })
    personal = {
      rows: rows.map((row) => strip(row)!),
      favorite: { name: favorite.name, groupRank: rankOf.get(favorite.wineId) ?? null },
      above: strip(pick(1)),
      below: strip(pick(-1)),
    }
  }

  const spreads = byPosition.flatMap((w) => {
    const xs = scores.filter((s) => s.wineId === w.id).map((s) => s.score)
    if (xs.length < MIN_SPREAD_RATINGS) return []
    return [{ position: w.position, name: nameOf.get(w.id) ?? `Wein #${w.position}`, min: Math.min(...xs), max: Math.max(...xs), spread: deviation(xs) }]
  })
  let controversial: SpreadWine | null = null
  let consensus: SpreadWine | null = null
  if (spreads.length >= 2) {
    // Ties keep the earlier (lower) position because byPosition is sorted and only strict improvements win
    const widest = spreads.reduce((a, b) => (b.spread > a.spread + EPSILON ? b : a))
    const narrowest = spreads.reduce((a, b) => (b.spread < a.spread - EPSILON ? b : a))
    if (widest.spread - narrowest.spread >= EPSILON) {
      const toWine = ({ position, name, min, max }: (typeof spreads)[number]): SpreadWine => ({ position, name, min, max })
      controversial = toWine(widest)
      consensus = toWine(narrowest)
    }
  }

  if (!personal && !controversial && !consensus) return null
  return { personal, controversial, consensus }
}
