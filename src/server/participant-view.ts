import type { Db } from '@/db/types'
import { wineTitle } from '@/lib/tasting/display'
import type { RingState } from '@/lib/tasting/progress'
import { canSeeWineNames } from '@/lib/tasting/rules'
import { getParticipantProgress } from './ratings'
import type { Tasting } from './tastings'
import { listWines } from './wines'

export type WineListItem = {
  position: number
  title: string
  subtitle: string | null
  state: RingState
  href: string
}

export async function getWineListItems(
  db: Db,
  tasting: Pick<Tasting, 'id' | 'code' | 'status' | 'blindTasting'>,
  participantId: string,
): Promise<WineListItem[]> {
  const [wineRows, progress] = await Promise.all([
    listWines(db, tasting.id),
    getParticipantProgress(db, tasting.id, participantId),
  ])
  const showNames = canSeeWineNames({ status: tasting.status, blindTasting: tasting.blindTasting, isAdmin: false })
  return wineRows.map((wine) => {
    return {
      position: wine.position,
      ...wineTitle(wine, showNames),
      state: progress.get(wine.id) ?? 'open',
      href: `/tasting/${tasting.code}/wine/${wine.position}`,
    }
  })
}
