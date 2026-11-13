import type { Metadata } from 'next'
import { DeleteTasting } from '@/components/admin/delete-tasting'
import { SettingsForm } from '@/components/admin/settings-form'
import { HostStatusControl } from '@/components/admin/host-status-control'
import { marginNote } from '@/components/styles'
import { getAdminTasting } from '@/lib/data'
import { formatDate } from '@/lib/format-date'
import { RETENTION_DAYS, deletionDate } from '@/lib/tasting/retention'
import { canEditStructure } from '@/lib/tasting/rules'

export const metadata: Metadata = { title: 'Allgemein · Verwaltung' }

export default async function GeneralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  return (
    <div className="grid max-w-xl gap-10">
      <HostStatusControl tasting={tasting} />
      <SettingsForm
        code={tasting.code}
        name={tasting.name}
        description={tasting.description}
        blindTasting={tasting.blindTasting}
        blindLocked={!canEditStructure(tasting.status)}
      />
      <div className="grid gap-3">
        <p className={marginNote}>
          Wird am {formatDate(deletionDate(tasting.createdAt))} automatisch gelöscht – {RETENTION_DAYS} Tage nach dem
          Erstellen, mit allen Weinen, Gästen und Bewertungen.
        </p>
        <DeleteTasting code={tasting.code} />
      </div>
    </div>
  )
}
