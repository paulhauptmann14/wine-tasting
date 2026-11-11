import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { joinAction } from './actions'
import { AdminLink } from '@/components/admin-link'
import { TastingCode } from '@/components/tasting-code'
import { StatusControl } from '@/components/admin/status-control'
import { AutoRefresh } from '@/components/auto-refresh'
import { BottomBar } from '@/components/bottom-bar'
import { CornerStain } from '@/components/corner-stain'
import { JoinForm } from '@/components/join-form'
import { PageShell } from '@/components/page-shell'
import { TastingSplit } from '@/components/tasting-split'
import { buttonVariants } from '@/components/ui/button'
import { WineList } from '@/components/wine-list'
import { db } from '@/db/client'
import { isAdmin } from '@/lib/auth/admin-session'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { getTasting } from '@/lib/data'
import { cn } from '@/lib/utils'
import { getWineListItems } from '@/server/participant-view'

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ saved?: string }> }

export default async function TastingPage({ params, searchParams }: Props) {
  const { code } = await params
  const { saved } = await searchParams
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  if (tasting.code !== code) redirect(`/tasting/${tasting.code}`)

  const [participant, admin] = await Promise.all([getCurrentParticipant(tasting), isAdmin(tasting)])

  if (!participant) {
    if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)
    return (
      <PageShell>
        <div className="relative">
          <CornerStain seed={tasting.name.length} />
          <p className="relative pt-28 text-sm text-muted-foreground lg:pt-16">Du bist eingeladen zu</p>
          <h1 className="relative mt-1 font-display text-4xl md:text-5xl leading-[1.08] font-medium tracking-tight lg:text-6xl lg:leading-[1.02]">
            {tasting.name}
          </h1>
          <JoinForm action={joinAction.bind(null, tasting.code)} />
        </div>
        <div className="mt-6 flex items-center gap-6">
          <TastingCode code={tasting.code} />
          <AdminLink code={tasting.code} />
        </div>
      </PageShell>
    )
  }

  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)

  if (tasting.status === 'setup' && admin) {
    // The host rates along – only they can start, so don't make them wait
    return (
      <PageShell>
        <div className="relative">
          <CornerStain seed={tasting.name.length} />
          <p className="relative pt-28 text-sm text-muted-foreground lg:pt-16">Hallo {participant.name}</p>
          <h1 className="relative mt-1 font-display text-4xl md:text-5xl leading-[1.08] font-medium tracking-tight lg:text-6xl lg:leading-[1.02]">
            {tasting.name}
          </h1>
          <p className="relative mt-4 max-w-[34ch] text-muted-foreground">
            Du bist Gastgeber. Starte das Tasting, sobald alle da sind.
          </p>
        </div>
        <div className="mt-8">
          <StatusControl code={tasting.code} status={tasting.status} />
        </div>
        <AdminLink code={tasting.code} className="mt-4" />
      </PageShell>
    )
  }

  if (tasting.status === 'setup') {
    return (
      <PageShell>
        <AutoRefresh />
        <div className="relative">
          <CornerStain seed={tasting.name.length} />
          <p className="relative pt-28 text-sm text-muted-foreground lg:pt-16">Hallo {participant.name}</p>
          <h1 className="relative mt-1 font-display text-4xl md:text-5xl leading-[1.08] font-medium tracking-tight lg:text-6xl lg:leading-[1.02]">
            {tasting.name}
          </h1>
          <p className="relative mt-4 max-w-[34ch] text-muted-foreground">
            Du bist dabei. Sobald der Gastgeber startet, erscheinen hier die Weine.
          </p>
        </div>
        <div className="mt-6 flex items-center gap-6">
          <TastingCode code={tasting.code} />
          <AdminLink code={tasting.code} />
        </div>
      </PageShell>
    )
  }

  const items = await getWineListItems(db, tasting, participant.id)
  const savedPosition = saved ? Number(saved) : undefined
  const doneCount = items.filter((i) => i.state === 'done').length
  const next = items.find((i) => i.state !== 'done')

  return (
    <TastingSplit aside={<WineList items={items} savedPosition={savedPosition} />}>
      {/* New wines and the end of the tasting appear without reloading */}
      <AutoRefresh />
      <header>
        <div className="flex items-center justify-between gap-4">
          <p className="min-w-0 truncate text-sm text-muted-foreground">Hallo {participant.name}</p>
          <div className="-my-3 flex shrink-0 items-center gap-6">
            <TastingCode code={tasting.code} />
            <AdminLink code={tasting.code} />
          </div>
        </div>
        <h1 className="mt-1 font-display text-4xl md:text-5xl leading-[1.08] font-medium tracking-tight lg:text-5xl">{tasting.name}</h1>
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">
          {doneCount} von {items.length} bewertet
        </p>
      </header>

      {items.length === 0 ? (
        <p className="mt-8 text-muted-foreground">Noch keine Weine. Der Gastgeber fügt sie gleich hinzu.</p>
      ) : (
        <div className="mt-6 lg:hidden">
          <WineList items={items} savedPosition={savedPosition} />
        </div>
      )}

      <BottomBar>
        <div className="grid gap-2 lg:flex">
          {next && (
            <Link href={next.href} className={cn(buttonVariants({ size: 'lg' }), 'h-14 text-base lg:px-8')}>
              {doneCount === 0 ? `Mit ${next.title} anfangen` : `Weiter mit ${next.title}`}
            </Link>
          )}
          {/* While wines are still open, the results are only a side path */}
          <Link
            href={`/tasting/${tasting.code}/results`}
            className={cn(
              next
                ? 'inline-flex h-12 items-center justify-center font-medium underline decoration-border decoration-2 underline-offset-[6px] transition-opacity duration-100 hover:decoration-wine active:opacity-50 lg:justify-start lg:px-4'
                : buttonVariants({ size: 'lg' }),
              !next && 'h-14 text-base lg:px-8',
            )}
          >
            Ergebnisse ansehen
          </Link>
        </div>
      </BottomBar>
    </TastingSplit>
  )
}
