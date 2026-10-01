import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { saveRatingAction } from '../../actions'
import { GlassRing } from '@/components/glass-ring'
import { RatingForm } from '@/components/rating-form'
import { TastingSplit } from '@/components/tasting-split'
import { WineList, WineRingStrip } from '@/components/wine-list'
import { db } from '@/db/client'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { getTasting } from '@/lib/data'
import { wineTitle } from '@/lib/tasting/display'
import { canRate, canSeeWineNames } from '@/lib/tasting/rules'
import { listCriteria } from '@/server/criteria'
import { getWineListItems } from '@/server/participant-view'
import { getRating } from '@/server/ratings'
import { getWineByPosition } from '@/server/wines'

type Props = { params: Promise<{ code: string; nr: string }>; searchParams: Promise<{ saved?: string }> }

export default async function WinePage({ params, searchParams }: Props) {
  const { code, nr } = await params
  const { saved } = await searchParams
  const position = Number(nr)
  const tasting = await getTasting(code)
  if (!tasting || !Number.isInteger(position) || position < 1) notFound()
  if (tasting.code !== code) redirect(`/tasting/${tasting.code}/wine/${position}`)

  const participant = await getCurrentParticipant(tasting)
  if (!participant) redirect(`/tasting/${tasting.code}`)
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)
  if (!canRate(tasting.status)) redirect(`/tasting/${tasting.code}`)

  const wine = await getWineByPosition(db, tasting.id, position)
  if (!wine) notFound()

  const [items, criteria, existing] = await Promise.all([
    getWineListItems(db, tasting, participant.id),
    listCriteria(db, tasting.id),
    getRating(db, participant.id, wine.id),
  ])
  const showName = canSeeWineNames({ status: tasting.status, blindTasting: tasting.blindTasting, isAdmin: false })
  const { title, subtitle } = wineTitle(wine, showName)
  const savedPosition = saved ? Number(saved) : undefined
  const doneCount = items.filter((i) => i.state === 'done').length

  return (
    <TastingSplit aside={<WineList items={items} currentPosition={position} savedPosition={savedPosition} />}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <Link href={`/tasting/${tasting.code}`} className="inline-flex h-12 items-center hover:text-foreground lg:hidden">
          ‹ Alle Weine
        </Link>
        <span className="ml-auto font-mono">
          {doneCount} / {items.length}
        </span>
      </div>
      <WineRingStrip items={items} currentPosition={position} savedPosition={savedPosition} />

      <header className="mt-6 flex items-center gap-5">
        <GlassRing seed={position} size={88}>
          <span className="font-display text-3xl">{position}</span>
        </GlassRing>
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight lg:text-4xl">{title}</h1>
          {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
        </div>
      </header>

      <RatingForm
        key={wine.id}
        action={saveRatingAction.bind(null, tasting.code, position)}
        criteria={criteria.map(({ id, name, scaleMin, scaleMax }) => ({ id, name, scaleMin, scaleMax }))}
        initialValues={existing?.values ?? {}}
        initialNotes={existing?.notes ?? ''}
        isLast={position === items.length}
      />
    </TastingSplit>
  )
}
