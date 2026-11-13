import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { joinAction } from './actions'
import { AdminLink } from '@/components/admin-link'
import { TastingCode } from '@/components/tasting-code'
import { StatusControl } from '@/components/admin/status-control'
import { AutoRefresh } from '@/components/auto-refresh'
import { BottomBar } from '@/components/bottom-bar'
import { JoinForm } from '@/components/join-form'
import { PageShell } from '@/components/page-shell'
import { TastingDescription } from '@/components/tasting-description'
import { marginNote, textLink } from '@/components/styles'
import { IntroNote, TastingIntro } from '@/components/tasting-intro'
import { TastingSplit } from '@/components/tasting-split'
import { buttonVariants } from '@/components/ui/button'
import { WineList } from '@/components/wine-list'
import { db } from '@/db/client'
import { isAdmin } from '@/lib/auth/admin-session'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { getTasting, requireTasting } from '@/lib/data'
import { parsePosition } from '@/lib/search-params'
import { countDone } from '@/lib/tasting/progress'
import { cn } from '@/lib/utils'
import { getWineListItems } from '@/server/participant-view'

/** The tasting's name – also what link previews of the invitation show. */
export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const tasting = await getTasting((await params).code)
  return tasting ? { title: tasting.name } : {}
}

type Props = { params: Promise<{ code: string }>; searchParams: Promise<{ saved?: string }> }

// Main button, with a little less side padding on laptops than the standard size
const mainAction = cn(buttonVariants({ size: 'main' }), 'lg:px-8')

/** Large tasting name with a greeting above it – the start of every pre-tasting view. */
function Intro({
  kicker,
  tasting,
  children,
}: {
  kicker: string
  tasting: { name: string; description: string | null }
  children?: ReactNode
}) {
  return (
    <TastingIntro kicker={kicker} title={tasting.name} seed={tasting.name.length} description={tasting.description}>
      {children}
    </TastingIntro>
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
        <Intro kicker="Du bist eingeladen zu" tasting={tasting}>
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
        <Intro kicker={`Hallo ${participant.name}`} tasting={tasting}>
          <IntroNote>Du bist Gastgeber. Starte das Tasting, sobald alle da sind.</IntroNote>
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
        <Intro kicker={`Hallo ${participant.name}`} tasting={tasting}>
          <IntroNote>Du bist dabei. Sobald der Gastgeber startet, erscheinen hier die Weine.</IntroNote>
        </Intro>
        <CodeRow code={tasting.code} />
      </PageShell>
    )
  }

  const items = await getWineListItems(db, tasting, participant.id)
  const savedPosition = parsePosition(saved)
  const doneCount = countDone(items)
  const next = items.find((i) => i.state !== 'done')
  const allRated = items.length > 0 && doneCount === items.length

  const intro = (
    <>
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
        <TastingDescription text={tasting.description} className="mt-2" />
        <p className="mt-2 text-sm text-muted-foreground tabular-nums">
          {doneCount} von {items.length} bewertet
        </p>
        {(savedPosition || allRated) && (
          // Present on load, so screen readers announce what the save did
          <div role="status" className="mt-4 grid gap-2">
            {savedPosition && <p className={marginNote}>Wein #{savedPosition} gespeichert.</p>}
            {allRated && (
              <p className={marginNote}>
                {tasting.blindTasting
                  ? 'Alles bewertet. Die Namen kommen, wenn der Gastgeber beendet.'
                  : 'Alles bewertet. Das Ergebnis steht fest, wenn der Gastgeber beendet.'}
              </p>
            )}
          </div>
        )}
      </header>
    </>
  )
  const actions = (
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
  )
  const list = <WineList items={items} savedPosition={savedPosition} />

  if (items.length === 0) {
    return (
      <TastingSplit aside={list}>
        {intro}
        <p className="mt-8 text-muted-foreground">Noch keine Weine. Der Gastgeber fügt sie gleich hinzu.</p>
        {actions}
      </TastingSplit>
    )
  }
  // On phones the list sits between header and buttons – one copy for both layouts, also in every refresh
  return (
    <TastingSplit aside={list} top={intro}>
      {actions}
    </TastingSplit>
  )
}
