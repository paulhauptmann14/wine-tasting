import { CriteriaManager } from '@/components/admin/criteria-manager'
import { ScoringExplainer } from '@/components/scoring-explainer'
import { db } from '@/db/client'
import { getAdminTasting } from '@/lib/data'
import { canEditStructure } from '@/lib/tasting/rules'
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
        locked={!canEditStructure(tasting.status)}
        criteria={criteria.map(({ id, name, position }) => ({ id, name, position }))}
      />
      <section aria-labelledby="scoring-heading" className="mt-6 max-w-xl">
        <h2 id="scoring-heading" className="text-sm font-medium">
          So wird gerechnet
        </h2>
        <ScoringExplainer scale={tasting.scale} criteria={criteria} className="mt-2" />
      </section>
    </div>
  )
}
