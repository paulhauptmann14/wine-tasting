export type RingState = 'open' | 'incomplete' | 'done'

export const RING_STATE_TEXT: Record<RingState, string> = { open: 'offen', incomplete: 'ergänzen', done: 'bewertet' }

/** A rating counts once it has a value for every criterion; no rating at all (undefined) is still open. */
export function ratingState(valueCount: number | undefined, criteriaCount: number): RingState {
  if (valueCount === undefined) return 'open'
  return valueCount >= criteriaCount ? 'done' : 'incomplete'
}
