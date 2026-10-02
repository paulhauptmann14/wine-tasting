import { WineManager } from '@/components/admin/wine-manager'
import { db } from '@/db/client'
import { getAdminTasting } from '@/lib/data'
import { canEditStructure } from '@/lib/tasting/rules'
import { listWines } from '@/server/wines'

export default async function WinesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const wines = await listWines(db, tasting.id)
  return (
    <WineManager
      code={tasting.code}
      locked={!canEditStructure(tasting.status)}
      wines={wines.map(({ id, position, name, vintage, grapeVariety, sweetness, wineType }) => ({
        id,
        position,
        name,
        vintage,
        grapeVariety,
        sweetness,
        wineType,
      }))}
    />
  )
}
