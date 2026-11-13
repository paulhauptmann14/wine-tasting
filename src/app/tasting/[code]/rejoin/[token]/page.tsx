import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { rejoinAction } from '../../actions'
import { BottomBar } from '@/components/bottom-bar'
import { PageShell } from '@/components/page-shell'
import { RejoinForm } from '@/components/rejoin-form'
import { marginNote } from '@/components/styles'
import { IntroNote, TastingIntro } from '@/components/tasting-intro'
import { buttonVariants } from '@/components/ui/button'
import { db } from '@/db/client'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { requireTasting } from '@/lib/data'
import { getSessionSecret } from '@/lib/env'
import { LIMITS } from '@/lib/limits'
import { cn } from '@/lib/utils'
import { findRejoinParticipant } from '@/server/participants'

// The token is a key to the guest's seat: keep it out of search engines and Referer headers
export const metadata: Metadata = {
  title: 'Zurück zum Tasting',
  robots: { index: false, follow: false },
  referrer: 'no-referrer',
}

type Props = { params: Promise<{ code: string; token: string }> }

/**
 * Personal link the host sends a guest who lost their seat (new phone, cleared cookies).
 * Opening it only asks – link previews in messengers fetch it too; the button signs in.
 */
export default async function RejoinPage({ params }: Props) {
  const { code, token } = await params
  const tasting = await requireTasting(code, `/rejoin/${encodeURIComponent(token)}`)
  if (tasting.status === 'finished') redirect(`/tasting/${tasting.code}/results`)

  const [guest, current] = await Promise.all([
    token.length <= LIMITS.rejoinLink ? findRejoinParticipant(db, tasting.id, token, getSessionSecret()) : null,
    getCurrentParticipant(tasting),
  ])

  if (!guest) {
    // No names here: an invalid link must not tell who it once belonged to
    return (
      <PageShell>
        <TastingIntro kicker={tasting.name} title="Dieser Link gilt nicht mehr." seed={tasting.name.length} sentence>
          <IntroNote>Frag den Gastgeber nach einem neuen – oder tritt neu bei.</IntroNote>
        </TastingIntro>
        <BottomBar>
          <Link href={`/tasting/${tasting.code}`} className={cn(buttonVariants({ size: 'main' }))}>
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
      <TastingIntro
        kicker="Willkommen zurück"
        title={tasting.name}
        seed={tasting.name.length}
        description={tasting.description}
      >
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
      </TastingIntro>
    </PageShell>
  )
}
