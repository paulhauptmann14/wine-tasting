import { notFound, redirect } from 'next/navigation'
import { saveRatingAction } from '../../actions'
import { AdminLink } from '@/components/admin-link'
import { GlassRing } from '@/components/glass-ring'
import { RatingForm } from '@/components/rating-form'
import { backLink, marginNote } from '@/components/styles'
import { TastingSplit } from '@/components/tasting-split'
import { GuardedLink, UnsavedGuardProvider } from '@/components/unsaved-guard'
import { WineList, WineRingStrip } from '@/components/wine-list'
import { WineSwipe } from '@/components/wine-swipe'
import { db } from '@/db/client'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { requireTasting } from '@/lib/data'
import { wineTitle } from '@/lib/tasting/display'
import { canRate, canSeeWineNames } from '@/lib/tasting/rules'
import { cn } from '@/lib/utils'
import { listCriteria } from '@/server/criteria'
import { getWineListItems } from '@/server/participant-view'
import { getRating } from '@/server/ratings'
import { getWineByPosition } from '@/server/wines'

type Props = { params: Promise<{ code: string; nr: string }>; searchParams: Promise<{ saved?: string; from?: string }> }

export default async function WinePage({ params, searchParams }: Props) {
  const { code, nr } = await params
  const { saved, from } = await searchParams
  const position = Number(nr)
  if (!Number.isInteger(position) || position < 1) notFound()
  const tasting = await requireTasting(code, `/wine/${position}`)

  const participant = await getCurrentParticipant(tasting)
  if (!participant) redirect(`/tasting/${tasting.code}`)
  // ?ended=1 lets the results page explain why the guest landed there
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results?ended=1`)
  if (!canRate(tasting.status)) redirect(`/tasting/${tasting.code}`)

  const wine = await getWineByPosition(db, tasting.id, position)
  if (!wine) notFound()

  const [items, criteria, existing] = await Promise.all([
    getWineListItems(db, tasting, participant.id),
    listCriteria(db, tasting.id),
    getRating(db, participant.id, wine.id),
  ])
  const showName = canSeeWineNames({ status: tasting.status, blindTasting: tasting.blindTasting, isAdmin: false })
  const { title, subtitle, description } = wineTitle(wine, showName)
  const savedPosition = saved && Number.isInteger(Number(saved)) && Number(saved) >= 1 ? Number(saved) : undefined
  // Where we came from (saved or swiped) decides the direction the wine arrives from
  const cameFrom = Number(saved ?? from)
  const arrival = cameFrom === position - 1 ? 'arrive-next' : cameFrom === position + 1 ? 'arrive-prev' : undefined
  const wineHref = (n: number) => `/tasting/${tasting.code}/wine/${n}?from=${position}`
  const doneCount = items.filter((i) => i.state === 'done').length

  return (
    // One unsaved-stars state for the swipe, the ring strip, the list and "Alle Weine"; fresh per wine
    <UnsavedGuardProvider key={position}>
      <TastingSplit aside={<WineList items={items} currentPosition={position} savedPosition={savedPosition} />}>
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <GuardedLink href={`/tasting/${tasting.code}`} className={cn(backLink, 'lg:hidden')}>
            ‹ Alle Weine
          </GuardedLink>
          <div className="ml-auto flex items-center gap-4">
            <AdminLink code={tasting.code} />
            <span>
              <span className="font-mono">
                {doneCount} / {items.length}
              </span>{' '}
              bewertet
            </span>
          </div>
        </div>
        <WineRingStrip items={items} currentPosition={position} savedPosition={savedPosition} />

        {savedPosition && (
          <p role="status" className={cn(marginNote, 'mt-4')}>
            Wein #{savedPosition} gespeichert.
          </p>
        )}

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
              <h1 className="font-display text-3xl leading-[1.1] font-medium tracking-tight md:text-4xl">
                {/* The number is drawn in the ring only; blind wines already have it as their title */}
                {showName && <span className="sr-only">Wein #{position}: </span>}
                {title}
              </h1>
              {subtitle && <p className="mt-1 text-muted-foreground">{subtitle}</p>}
              {description && <p className="mt-1 text-sm text-pretty break-words text-muted-foreground">{description}</p>}
            </div>
          </header>

          <RatingForm
            key={wine.id}
            action={saveRatingAction.bind(null, tasting.code, wine.id, wine.position)}
            criteria={criteria.map(({ id, name, scaleMin, scaleMax }) => ({ id, name, scaleMin, scaleMax }))}
            initialValues={existing?.values ?? {}}
            initialNotes={existing?.notes ?? ''}
            isLast={position === items.length}
          />
        </WineSwipe>
      </TastingSplit>
    </UnsavedGuardProvider>
  )
}
