import { notFound } from 'next/navigation'
import { WineManager } from '@/components/admin/wine-manager'
import { db } from '@/db/client'
import { getTasting } from '@/lib/data'
import { listWines } from '@/server/wines'

export default async function WinesPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  const wines = await listWines(db, tasting.id)
  return (
    <WineManager
      code={tasting.code}
      wines={wines.map(({ id, position, name, vintage, grapeVariety }) => ({ id, position, name, vintage, grapeVariety }))}
    />
  )
}
