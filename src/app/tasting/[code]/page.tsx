import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { joinAction } from './actions'
import { AdminLink } from '@/components/admin-link'
import { TastingCode } from '@/components/tasting-code'
import { StatusControl } from '@/components/admin/status-control'
import { AutoRefresh } from '@/components/auto-refresh'
import { BottomBar } from '@/components/bottom-bar'
import { CornerStain } from '@/components/corner-stain'
import { JoinForm } from '@/components/join-form'
import { PageShell } from '@/components/page-shell'
import { textLink } from '@/components/styles'
import { TastingSplit } from '@/components/tasting-split'
import { buttonVariants } from '@/components/ui/button'
import { WineList } from '@/components/wine-list'
import { db } from '@/db/client'
import { isAdmin } from '@/lib/auth/admin-session'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { requireTasting } from '@/lib/data'
import { cn } from '@/lib/utils'
import { getWineListItems } from '@/server/participant-view'

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ saved?: string }> }

const mainAction = cn(buttonVariants({ size: 'lg' }), 'h-14 text-base lg:px-8')

/** Large title with a greeting above it, on the corner stain – the start of every pre-tasting view. */
function Intro({ kicker, name, children }: { kicker: string; name: string; children?: ReactNode }) {
  return (
    <div className="relative">
      <CornerStain seed={name.length} />
      <p className="relative pt-28 text-sm text-muted-foreground lg:pt-16">{kicker}</p>
      <h1 className="relative mt-1 font-display text-4xl md:text-5xl leading-[1.08] font-medium tracking-tight lg:text-6xl lg:leading-[1.02]">
        {name}
      </h1>
      {children}
    </div>
  )
}

function CodeRow({ code }: { code: string }) {
  return (
    <div className="mt-6 flex items-center gap-6">
      <TastingCode code={code} />
      <AdminLink code={code} />
    </div>
  )
}

export default async function TastingPage({ params, searchParams }: Props) {
  const { code } = await params
  const { saved } = await searchParams
  const tasting = await requireTasting(code, '')
  // Nothing left to join or rate – with or without a seat
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)

  const [participant, admin] = await Promise.all([getCurrentParticipant(tasting), isAdmin(tasting)])

  if (!participant) {
    return (
      <PageShell>
        <Intro kicker="Du bist eingeladen zu" name={tasting.name}>
          <JoinForm action={joinAction.bind(null, tasting.code)} />
        </Intro>
        <CodeRow code={tasting.code} />
      </PageShell>
    )
  }

  if (tasting.status === 'setup' && admin) {
    // The host rates along – only they can start, so don't make them wait
    return (
      <PageShell>
        <Intro kicker={`Hallo ${participant.name}`} name={tasting.name}>
          <p className="relative mt-4 max-w-[34ch] text-muted-foreground">
            Du bist Gastgeber. Starte das Tasting, sobald alle da sind.
          </p>
        </Intro>
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
        <Intro kicker={`Hallo ${participant.name}`} name={tasting.name}>
          <p className="relative mt-4 max-w-[34ch] text-muted-foreground">
            Du bist dabei. Sobald der Gastgeber startet, erscheinen hier die Weine.
          </p>
        </Intro>
        <CodeRow code={tasting.code} />
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
            <Link href={next.href} className={mainAction}>
              {doneCount === 0 ? `Mit ${next.title} anfangen` : `Weiter mit ${next.title}`}
            </Link>
          )}
          {/* While wines are still open, the results are only a side path */}
          <Link
            href={`/tasting/${tasting.code}/results`}
            className={next ? cn(textLink, 'justify-center lg:justify-start lg:px-4') : mainAction}
          >
            Ergebnisse ansehen
          </Link>
        </div>
      </BottomBar>
    </TastingSplit>
  )
}
