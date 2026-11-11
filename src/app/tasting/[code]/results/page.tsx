import Link from 'next/link'
import { AdminLink } from '@/components/admin-link'
import { TastingCode } from '@/components/tasting-code'
import { AutoRefresh } from '@/components/auto-refresh'
import { BottomBar } from '@/components/bottom-bar'
import { PageShell } from '@/components/page-shell'
import { ResultsSection } from '@/components/results-section'
import { ShareResultsImage } from '@/components/share-results-image'
import { StatusPill } from '@/components/status-pill'
import { backLink } from '@/components/styles'
import { isAdmin } from '@/lib/auth/admin-session'
import { getCurrentParticipant } from '@/lib/auth/participant-session'
import { requireTasting } from '@/lib/data'
import { cn } from '@/lib/utils'

export default async function ResultsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await requireTasting(code, '/results')

  const [admin, participant] = await Promise.all([isAdmin(tasting), getCurrentParticipant(tasting)])

  return (
    <PageShell width="wide">
      {tasting.status !== 'finished' && <AutoRefresh />}
      {/* Wraps on narrow phones instead of squeezing the back link into a column */}
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        {participant && tasting.status === 'active' ? (
          <Link href={`/tasting/${tasting.code}`} className={cn(backLink, 'whitespace-nowrap')}>
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
      <h1 className="mt-4 font-display text-4xl md:text-5xl leading-tight lg:text-5xl">{tasting.name}</h1>
      {/* Sharing the final ranking is the main action once finished: fixed bar on phones, below the title from lg */}
      {tasting.status === 'finished' && (
        <BottomBar>
          <ShareResultsImage code={tasting.code} title={tasting.name} />
        </BottomBar>
      )}
      <ResultsSection tasting={tasting} isAdmin={admin} />
    </PageShell>
  )
}
