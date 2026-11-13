import { StatusControl } from '@/components/admin/status-control'
import { AutoRefresh } from '@/components/auto-refresh'
import { db } from '@/db/client'
import { countUnfinished } from '@/lib/tasting/host-hints'
import { listParticipantProgress } from '@/server/participants'
import type { Tasting } from '@/server/tastings'

/**
 * Start/finish control of the admin pages. While the tasting runs it counts the unfinished guests
 * for the finish dialog and keeps that number current.
 */
export async function HostStatusControl({
  tasting,
}: {
  tasting: Pick<Tasting, 'id' | 'code' | 'status' | 'blindTasting'>
}) {
  const openGuests =
    tasting.status === 'active' ? countUnfinished(await listParticipantProgress(db, tasting.id)) : 0
  return (
    <>
      {/* Keeps the number of unfinished guests in the finish dialog current */}
      {tasting.status === 'active' && <AutoRefresh />}
      <StatusControl
        code={tasting.code}
        status={tasting.status}
        blindTasting={tasting.blindTasting}
        openGuests={openGuests}
      />
    </>
  )
}
