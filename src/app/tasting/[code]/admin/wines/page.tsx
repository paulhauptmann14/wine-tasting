import { WineManager } from '@/components/admin/wine-manager'
import { db } from '@/db/client'
import { getAdminTasting } from '@/lib/data'
import { canEditStructure } from '@/lib/tasting/rules'
import { listWines, ratedWineIds } from '@/server/wines'

export default async function WinesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const [wines, rated] = await Promise.all([listWines(db, tasting.id), ratedWineIds(db, tasting.id)])
  return (
    <WineManager
      code={tasting.code}
      locked={!canEditStructure(tasting.status)}
      status={tasting.status}
      unratedCount={wines.filter((wine) => !rated.has(wine.id)).length}
      wines={wines.map(({ id, position, name, winery, vintage, grapeVariety, sweetness, wineType, description }) => ({
        id,
        position,
        name,
        winery,
        vintage,
        grapeVariety,
        sweetness,
        wineType,
        description,
      }))}
    />
  )
}
