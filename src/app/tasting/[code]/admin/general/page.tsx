import { DeleteTasting } from '@/components/admin/delete-tasting'
import { SettingsForm } from '@/components/admin/settings-form'
import { StatusControl } from '@/components/admin/status-control'
import { AutoRefresh } from '@/components/auto-refresh'
import { marginNote } from '@/components/styles'
import { db } from '@/db/client'
import { getAdminTasting } from '@/lib/data'
import { countUnfinished } from '@/lib/tasting/host-hints'
import { RETENTION_DAYS, deletionDate } from '@/lib/tasting/retention'
import { canEditStructure } from '@/lib/tasting/rules'
import { listParticipantProgress } from '@/server/participants'

export default async function GeneralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const openGuests =
    tasting.status === 'active' ? countUnfinished(await listParticipantProgress(db, tasting.id)) : 0
  return (
    <div className="grid max-w-xl gap-10">
      {/* Keeps the number of unfinished guests in the finish dialog current */}
      {tasting.status === 'active' && <AutoRefresh />}
      <StatusControl
        code={tasting.code}
        status={tasting.status}
        blindTasting={tasting.blindTasting}
        openGuests={openGuests}
      />
      <SettingsForm
        code={tasting.code}
        name={tasting.name}
        blindTasting={tasting.blindTasting}
        blindLocked={!canEditStructure(tasting.status)}
      />
      <div className="grid gap-3">
        <p className={marginNote}>
          Wird am{' '}
          {deletionDate(tasting.createdAt).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}{' '}
          automatisch gelöscht – {RETENTION_DAYS} Tage nach dem Erstellen, mit allen Weinen, Gästen und Bewertungen.
        </p>
        <DeleteTasting code={tasting.code} />
      </div>
    </div>
  )
}
