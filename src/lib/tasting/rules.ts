export const STATUS_KEYS = ['setup', 'active', 'finished'] as const
export type TastingStatus = (typeof STATUS_KEYS)[number]

export const STATUS_LABELS: Record<TastingStatus, string> = {
  setup: 'Vorbereitung',
  active: 'Läuft',
  finished: 'Beendet',
}

/** Status explanation for the host – mentions hidden names and the reveal only for blind tastings. */
export function statusHint(status: TastingStatus, blindTasting: boolean): string {
  if (status === 'setup') return 'Gäste können beitreten, aber noch nicht bewerten.'
  if (status === 'active') {
    return blindTasting
      ? 'Gäste bewerten. Ergebnisse sind live, Blindweine bleiben für Gäste verborgen – nur du siehst die Namen.'
      : 'Gäste bewerten. Ergebnisse sind live.'
  }
  return blindTasting ? 'Bewertungen sind gesperrt, alle Weine sind aufgelöst.' : 'Bewertungen sind gesperrt.'
}

/**
 * Deleting wines and adding/removing/moving criteria only during setup: otherwise ratings get lost
 * or become incomplete. Reordering wines is always allowed – ratings follow the wine, not its number.
 */
export const canEditStructure = (status: TastingStatus) => status === 'setup'
export const STRUCTURE_LOCK_HINT =
  'Das Tasting läuft. Kriterien und Bewertungssystem ändern geht nur in der Vorbereitung, umbenennen immer.'
export const WINE_LOCK_HINT =
  'Das Tasting läuft. Umsortieren geht weiter, Löschen nur in der Vorbereitung.'
/** Longer explanation behind the info button next to WINE_LOCK_HINT */
export const WINE_REORDER_INFO =
  'Umsortieren ändert nur die Nummern. Die Sterne bleiben beim Wein. Das ist richtig, wenn du die Reihenfolge für die nächsten Gläser änderst. Wurde schon falsch eingeschenkt (Glas 2 war in Wahrheit Wein 3), tausch stattdessen die Angaben der beiden Weine über ✎ – dann passen die Sterne wieder zum Glas. „Reihenfolge mischen“ bewegt nur Weine ohne Bewertung.'
/** Shown instead of a rating-system switch while ratings exist: says what it takes to get out */
export const RATING_SYSTEM_LOCKED_HINT =
  'Es gibt schon Bewertungen. Zum Wechseln entfern zuerst die Gäste unter Teilnehmer.'
/** Admin-only reminder while a blind tasting runs: guests don't see the names, the host does */
export const BLIND_ADMIN_HINT = 'Nur du siehst die Namen.'

/**
 * Shuffling the pouring order is allowed until the tasting is finished. Only wines nobody rated yet
 * move (see shuffleUnrated), so guests lose nothing.
 */
export const canShuffleWines = (status: TastingStatus) => status !== 'finished'
export const SHUFFLE_FINISHED_HINT = 'Das Tasting ist beendet. Die Reihenfolge lässt sich nicht mehr mischen.'
export const SHUFFLE_EXPLAIN_HINT =
  'Für Blindverkostungen: würfelt die Nummern, damit niemand die Flaschen-Reihenfolge kennt.'
export const SHUFFLE_RUNNING_HINT = 'Mischt nur Weine, die noch niemand bewertet hat. Gäste mit offener Weinseite sollten neu laden.'
export const SHUFFLE_TOO_FEW_HINT = 'Zum Mischen braucht es mindestens zwei Weine ohne Bewertung.'

export const canJoin = (status: TastingStatus) => status !== 'finished'
export const canRate = (status: TastingStatus) => status === 'active'
export const canSeeResults = (status: TastingStatus, isAdmin: boolean) => isAdmin || status !== 'setup'
/** Notes only at the end – before that they would give away blind wines and influence the others. */
export const canSeeNotes = (status: TastingStatus) => status === 'finished'

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
