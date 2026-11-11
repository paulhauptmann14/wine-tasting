import { CriteriaManager } from '@/components/admin/criteria-manager'
import { db } from '@/db/client'
import { getAdminTasting } from '@/lib/data'
import { SCALES } from '@/lib/tasting/presets'
import { canEditStructure } from '@/lib/tasting/rules'
import { listCriteria } from '@/server/criteria'

export default async function CriteriaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const criteria = await listCriteria(db, tasting.id)
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">
        Jedes Kriterium wird mit 1–5 Sternen bewertet. Die Note wird
        {tasting.scale === 'five' ? ' als Durchschnitt' : ' gewichtet'} von {SCALES[tasting.scale].max} angezeigt.
      </p>
      <CriteriaManager
        code={tasting.code}
        locked={!canEditStructure(tasting.status)}
        criteria={criteria.map(({ id, name, position }) => ({ id, name, position }))}
      />
    </div>
  )
}
