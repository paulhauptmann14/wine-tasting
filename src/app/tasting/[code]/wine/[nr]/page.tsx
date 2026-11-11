import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { saveRatingAction } from '../../actions'
import { AdminLink } from '@/components/admin-link'
import { GlassRing } from '@/components/glass-ring'
import { RatingForm } from '@/components/rating-form'
import { TastingSplit } from '@/components/tasting-split'
import { WineList, WineRingStrip } from '@/components/wine-list'
import { WineSwipe } from '@/components/wine-swipe'
import { db } from '@/db/client'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { getTasting } from '@/lib/data'
import { wineTitle } from '@/lib/tasting/display'
import { canRate, canSeeWineNames } from '@/lib/tasting/rules'
import { listCriteria } from '@/server/criteria'
import { getWineListItems } from '@/server/participant-view'
import { getRating } from '@/server/ratings'
import { getWineByPosition } from '@/server/wines'

type Props = { params: Promise<{ code: string; nr: string }>; searchParams: Promise<{ saved?: string; from?: string }> }

export default async function WinePage({ params, searchParams }: Props) {
  const { code, nr } = await params
  const { saved, from } = await searchParams
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
  // Where we came from (saved or swiped) decides the direction the wine arrives from
  const cameFrom = Number(saved ?? from)
  const arrival = cameFrom === position - 1 ? 'arrive-next' : cameFrom === position + 1 ? 'arrive-prev' : undefined
  const wineHref = (n: number) => `/tasting/${tasting.code}/wine/${n}?from=${position}`
  const doneCount = items.filter((i) => i.state === 'done').length

  return (
    <TastingSplit aside={<WineList items={items} currentPosition={position} savedPosition={savedPosition} />}>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <Link href={`/tasting/${tasting.code}`} className="inline-flex h-12 items-center hover:text-foreground transition-opacity duration-100 active:opacity-50 lg:hidden">
          ‹ Alle Weine
        </Link>
        <div className="ml-auto flex items-center gap-4">
          <AdminLink code={tasting.code} />
          <span className="font-mono">
            {doneCount} / {items.length}
          </span>
        </div>
      </div>
      <WineRingStrip items={items} currentPosition={position} savedPosition={savedPosition} />

      {/* Remounted per wine so the arrival plays again after every save or swipe */}
      <WineSwipe
        key={position}
        className={arrival}
        prevHref={position > 1 ? wineHref(position - 1) : undefined}
        nextHref={position < items.length ? wineHref(position + 1) : undefined}
      >
        <header className="mt-6 flex items-center gap-4">
          <GlassRing seed={position} size={96} className="-ml-2">
            <span className="font-display text-4xl font-medium">{position}</span>
          </GlassRing>
          <div className="min-w-0">
            {!showName && <p className="text-sm text-muted-foreground">Blind verkostet</p>}
            <h1 className="font-display text-3xl leading-[1.1] font-medium tracking-tight lg:text-4xl">{title}</h1>
            {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
          </div>
        </header>

        <RatingForm
          key={wine.id}
          action={saveRatingAction.bind(null, tasting.code, wine.id)}
          criteria={criteria.map(({ id, name, scaleMin, scaleMax }) => ({ id, name, scaleMin, scaleMax }))}
          initialValues={existing?.values ?? {}}
          initialNotes={existing?.notes ?? ''}
          isLast={position === items.length}
        />
      </WineSwipe>
    </TastingSplit>
  )
}
