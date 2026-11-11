import type { Direction } from '@/lib/validation'

/** The ids with `id` swapped one step up or down – or null if it can't move (unknown id, already at the edge). */
export function moveInOrder<T>(ids: readonly T[], id: T, direction: Direction): T[] | null {
  const from = ids.indexOf(id)
  const to = direction === 'up' ? from - 1 : from + 1
  if (from < 0 || to < 0 || to >= ids.length) return null
  const moved = [...ids]
  ;[moved[from], moved[to]] = [moved[to], moved[from]]
  return moved
}

/** Random integer in [0, max) – injected so tests can run deterministically. */
export type RandomInt = (max: number) => number

const MAX_SHUFFLE_ATTEMPTS = 8

function fisherYates<T>(items: readonly T[], randomInt: RandomInt): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

/**
 * All ids in a new order: the unrated wines are permuted among their own positions, rated wines keep theirs.
 * The result always differs from the input (no visible no-op). Returns null with fewer than two unrated wines.
 */
export function shuffleUnrated(
  ordered: readonly { id: string; rated: boolean }[],
  randomInt: RandomInt,
): string[] | null {
  const slots = ordered.flatMap((wine, index) => (wine.rated ? [] : [index]))
  if (slots.length < 2) return null
  const original = slots.map((index) => ordered[index].id)

  let shuffled = fisherYates(original, randomInt)
  for (let attempt = 1; attempt < MAX_SHUFFLE_ATTEMPTS && shuffled.every((id, i) => id === original[i]); attempt++) {
    shuffled = fisherYates(original, randomInt)
  }
  // Still unchanged (≈ never with real randomness): rotate by one, which always differs for >= 2 distinct ids
  if (shuffled.every((id, i) => id === original[i])) shuffled = [...original.slice(1), original[0]]

  const result = ordered.map((wine) => wine.id)
  for (const [i, index] of slots.entries()) result[index] = shuffled[i]
  return result
}
