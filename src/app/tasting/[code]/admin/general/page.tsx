import { DeleteTasting } from '@/components/admin/delete-tasting'
import { SettingsForm } from '@/components/admin/settings-form'
import { StatusControl } from '@/components/admin/status-control'
import { marginNote } from '@/components/styles'
import { getAdminTasting } from '@/lib/data'
import { RETENTION_DAYS, deletionDate } from '@/lib/tasting/retention'
import { canEditStructure } from '@/lib/tasting/rules'

export default async function GeneralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  return (
    <div className="grid max-w-xl gap-10">
      <StatusControl code={tasting.code} status={tasting.status} />
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
