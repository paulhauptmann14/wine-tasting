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
