import { CriteriaManager } from '@/components/admin/criteria-manager'
import { db } from '@/db/client'
import { getAdminTasting } from '@/lib/data'
import { listCriteria } from '@/server/criteria'

export default async function CriteriaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const criteria = await listCriteria(db, tasting.id)
  return (
    <div className="grid gap-4">
      <p className="text-sm text-muted-foreground">Jedes Kriterium wird mit 1–5 Sternen bewertet.</p>
      <CriteriaManager
        code={tasting.code}
        criteria={criteria.map(({ id, name, position }) => ({ id, name, position }))}
      />
    </div>
  )
}
