import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { joinAction } from './actions'
import { AdminLink } from '@/components/admin-link'
import { StatusControl } from '@/components/admin/status-control'
import { AutoRefresh } from '@/components/auto-refresh'
import { BottomBar } from '@/components/bottom-bar'
import { GlassRing } from '@/components/glass-ring'
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
        <div className="flex flex-col items-center pt-6 text-center lg:pt-0">
          <GlassRing seed={tasting.name.length} size={88} />
          <p className="mt-6 text-sm text-muted-foreground">Du bist eingeladen zu</p>
          <h1 className="mt-1 font-display text-4xl leading-tight">{tasting.name}</h1>
        </div>
        <JoinForm action={joinAction.bind(null, tasting.code)} />
      </PageShell>
    )
  }

  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)

  if (tasting.status === 'setup' && admin) {
    // Der Gastgeber bewertet selbst mit – nur er kann starten, also nicht warten lassen
    return (
      <PageShell>
        <div className="flex flex-col items-center pt-6 text-center lg:pt-0">
          <GlassRing seed={tasting.name.length} state="open" size={88} />
          <p className="mt-6 text-sm text-muted-foreground">Hallo {participant.name}</p>
          <h1 className="mt-1 font-display text-4xl leading-tight">{tasting.name}</h1>
          <p className="mt-4 max-w-[32ch] text-muted-foreground">
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
        <div className="flex flex-col items-center pt-6 text-center lg:pt-0">
          <GlassRing seed={tasting.name.length} state="open" size={88} />
          <p className="mt-6 text-sm text-muted-foreground">Hallo {participant.name}</p>
          <h1 className="mt-1 font-display text-4xl leading-tight">{tasting.name}</h1>
          <p className="mt-4 max-w-[32ch] text-muted-foreground">
            Gleich geht&apos;s los. Sobald der Gastgeber startet, kannst du hier bewerten.
          </p>
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
      {/* Neue Weine und das Ende des Tastings erscheinen ohne Neuladen */}
      <AutoRefresh />
      <header>
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">Hallo {participant.name}</p>
          {admin && <AdminLink code={tasting.code} className="-my-3" />}
        </div>
        <h1 className="mt-1 font-display text-4xl leading-tight lg:text-5xl">{tasting.name}</h1>
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
          <Link
            href={`/tasting/${tasting.code}/results`}
            className={cn(
              buttonVariants({ size: 'lg', variant: next ? 'secondary' : 'default' }),
              'h-14 text-base lg:px-8',
            )}
          >
            Ergebnisse ansehen
          </Link>
        </div>
      </BottomBar>
    </TastingSplit>
  )
}
