export type TastingStatus = 'setup' | 'active' | 'finished'

export const STATUS_LABELS: Record<TastingStatus, string> = {
  setup: 'Vorbereitung',
  active: 'Läuft',
  finished: 'Beendet',
}

export const STATUS_HINTS: Record<TastingStatus, string> = {
  setup: 'Gäste können beitreten, aber noch nicht bewerten.',
  active: 'Gäste bewerten. Ergebnisse sind live, Blindweine bleiben verborgen.',
  finished: 'Bewertungen sind gesperrt, alle Weine sind aufgelöst.',
}

export const canJoin = (status: TastingStatus) => status !== 'finished'
export const canRate = (status: TastingStatus) => status === 'active'
export const canSeeResults = (status: TastingStatus, isAdmin: boolean) => isAdmin || status !== 'setup'

export function canSeeWineNames(input: {
  status: TastingStatus
  blindTasting: boolean
  isAdmin: boolean
}): boolean {
  return input.isAdmin || !input.blindTasting || input.status === 'finished'
}

const ALLOWED: Record<TastingStatus, TastingStatus[]> = {
  setup: ['active'],
  active: ['setup', 'finished'],
  finished: ['active'],
}

export function canTransition(
  from: TastingStatus,
  to: TastingStatus,
  counts: { wineCount: number; criteriaCount: number },
): { ok: true } | { ok: false; reason: string } {
  if (!ALLOWED[from].includes(to)) return { ok: false, reason: 'Dieser Statuswechsel ist nicht möglich.' }
  if (to === 'active' && counts.wineCount === 0) {
    return { ok: false, reason: 'Füg zuerst mindestens einen Wein hinzu.' }
  }
  if (to === 'active' && counts.criteriaCount === 0) {
    return { ok: false, reason: 'Leg zuerst mindestens ein Bewertungskriterium an.' }
  }
  return { ok: true }
}
