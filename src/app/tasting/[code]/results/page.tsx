import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { AdminLink } from '@/components/admin-link'
import { TastingCode } from '@/components/tasting-code'
import { AutoRefresh } from '@/components/auto-refresh'
import { PageShell } from '@/components/page-shell'
import { ResultsSection } from '@/components/results-section'
import { StatusPill } from '@/components/status-pill'
import { isAdmin } from '@/lib/auth/admin-session'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { getTasting } from '@/lib/data'

export default async function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  if (tasting.code !== code) redirect(`/tasting/${tasting.code}/results`)

  const [admin, participant] = await Promise.all([isAdmin(tasting), getCurrentParticipant(tasting)])

  return (
    <PageShell width="wide">
      {tasting.status !== 'finished' && <AutoRefresh />}
      {/* Wraps on narrow phones instead of squeezing the back link into a column */}
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        {participant && tasting.status === 'active' ? (
          <Link
            href={`/tasting/${tasting.code}`}
            className="inline-flex h-12 items-center text-sm whitespace-nowrap text-muted-foreground hover:text-foreground transition-opacity duration-100 active:opacity-50"
          >
            ‹ Alle Weine
          </Link>
        ) : (
          <span />
        )}
        <div className="ml-auto flex items-center gap-4">
          <TastingCode code={tasting.code} />
          <AdminLink code={tasting.code} />
          <StatusPill status={tasting.status} />
        </div>
      </div>
      <h1 className="mt-4 font-display text-4xl leading-tight lg:text-5xl">{tasting.name}</h1>
      <ResultsSection tasting={tasting} isAdmin={admin} />
    </PageShell>
  )
}
