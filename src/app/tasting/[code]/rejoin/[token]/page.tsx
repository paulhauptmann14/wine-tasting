import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { rejoinAction } from '../../actions'
import { BottomBar } from '@/components/bottom-bar'
import { CornerStain } from '@/components/corner-stain'
import { PageShell } from '@/components/page-shell'
import { RejoinForm } from '@/components/rejoin-form'
import { marginNote } from '@/components/styles'
import { TastingDescription } from '@/components/tasting-description'
import { buttonVariants } from '@/components/ui/button'
import { db } from '@/db/client'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { requireTasting } from '@/lib/data'
import { getSessionSecret } from '@/lib/env'
import { cn } from '@/lib/utils'
import { findRejoinParticipant } from '@/server/participants'

// The token is a key to the guest's seat: keep it out of search engines and Referer headers
export const metadata: Metadata = {
  title: 'Zurück zum Tasting · Wine Tasting',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

type Props = { params: Promise<{ code: string; token: string }> }

const MAX_LINK_LENGTH = 100

/**
 * Personal link the host sends a guest who lost their seat (new phone, cleared cookies).
 * Opening it only asks – link previews in messengers fetch it too; the button signs in.
 */
export default async function RejoinPage({ params }: Props) {
  const { code, token } = await params
  const tasting = await requireTasting(code, `/rejoin/${encodeURIComponent(token)}`)
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)

  const [guest, current] = await Promise.all([
    token.length <= MAX_LINK_LENGTH ? findRejoinParticipant(db, tasting.id, token, getSessionSecret()) : null,
    getCurrentParticipant(tasting),
  ])

  if (!guest) {
    // No names here: an invalid link must not tell who it once belonged to
    return (
      <PageShell>
        <div className="relative">
          <CornerStain seed={tasting.name.length} />
          <p className="relative pt-28 text-sm text-muted-foreground lg:pt-16">{tasting.name}</p>
          <h1 className="relative mt-1 font-display text-4xl leading-[1.08] font-medium tracking-tight md:text-5xl">
            Dieser Link gilt nicht mehr.
          </h1>
          <p className="relative mt-4 max-w-[34ch] text-muted-foreground">
            Frag den Gastgeber nach einem neuen – oder tritt neu bei.
          </p>
        </div>
        <BottomBar>
          <Link
            href={`/tasting/${tasting.code}`}
            className={cn(buttonVariants({ size: 'lg' }), 'h-14 w-full text-base lg:w-auto lg:px-10')}
          >
            Zum Tasting
          </Link>
        </BottomBar>
      </PageShell>
    )
  }

  // Already this guest on this device – nothing to confirm
  if (current?.id === guest.id) redirect(`/tasting/${tasting.code}`)

  return (
    <PageShell>
      <div className="relative">
        <CornerStain seed={tasting.name.length} />
        <p className="relative pt-28 text-sm text-muted-foreground lg:pt-16">Willkommen zurück</p>
        <h1 className="relative mt-1 font-display text-4xl leading-[1.08] font-medium tracking-tight md:text-5xl lg:text-6xl lg:leading-[1.02]">
          {tasting.name}
        </h1>
        <TastingDescription text={tasting.description} className="relative mt-3" />
        <p className="relative mt-6 max-w-[34ch]">
          Du machst als <strong className="font-semibold">{guest.name}</strong> weiter – mit allem, was du schon
          bewertet hast.
        </p>
        {current && (
          <p className={cn(marginNote, 'relative mt-4 max-w-[40ch]')}>
            Auf diesem Gerät bist du gerade als {current.name} dabei. Danach bist du hier {guest.name}.
          </p>
        )}
        <RejoinForm action={rejoinAction.bind(null, tasting.code, token)} name={guest.name} />
      </div>
    </PageShell>
  )
}
