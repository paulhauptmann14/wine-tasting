/** Small hints for the host's admin pages: unfinished guests, duplicate names. */

/** Guests who haven't rated every wine completely yet. */
export function countUnfinished(people: readonly { doneCount: number; wines: readonly unknown[] }[]): number {
  return people.filter((p) => p.doneCount < p.wines.length).length
}

/** "2 Gäste sind noch nicht fertig." – empty when everyone is done. */
export function unfinishedGuestsText(count: number): string {
  if (count <= 0) return ''
  return count === 1 ? '1 Gast ist noch nicht fertig.' : `${count} Gäste sind noch nicht fertig.`
}

export type DuplicateName = { name: string; count: number }

const normalizeName = (name: string) => name.trim().toLocaleLowerCase('de')

/**
 * Names that occur more than once (case and surrounding spaces ignored), keyed by the normalized name.
 * Usually the same guest on a new device: the session cookie is per browser.
 */
export function findDuplicateNames(names: readonly string[]): Map<string, DuplicateName> {
  const all = new Map<string, DuplicateName>()
  for (const name of names) {
    const key = normalizeName(name)
    const entry = all.get(key)
    if (entry) entry.count++
    else all.set(key, { name: name.trim(), count: 1 })
  }
  return new Map([...all].filter(([, entry]) => entry.count > 1))
}

export const isDuplicateName = (duplicates: Map<string, DuplicateName>, name: string) =>
  duplicates.has(normalizeName(name))

const TIMES: Record<number, string> = { 2: 'Zweimal', 3: 'Dreimal', 4: 'Viermal' }

export function duplicateNameHint({ name, count }: DuplicateName): string {
  const times = TIMES[count] ?? `${count}-mal`
  return `${times} ${name}? Vermutlich ein neues Handy – entfern den Eintrag ohne Bewertungen.`
}
