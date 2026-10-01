import { SettingsForm } from '@/components/admin/settings-form'
import { StatusControl } from '@/components/admin/status-control'
import { getAdminTasting } from '@/lib/data'

export default async function GeneralPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  return (
    <div className="grid max-w-xl gap-10">
      <StatusControl code={tasting.code} status={tasting.status} />
      <SettingsForm code={tasting.code} name={tasting.name} blindTasting={tasting.blindTasting} />
    </div>
  )
}
