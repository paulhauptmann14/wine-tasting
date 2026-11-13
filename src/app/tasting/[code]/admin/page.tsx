import type { Metadata } from 'next'
import Link from 'next/link'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { HostStatusControl } from '@/components/admin/host-status-control'
import { CopyCodeButton } from '@/components/copy-code-button'
import { JoinQr } from '@/components/join-qr'
import { marginNote, textLink, textLinkFocus } from '@/components/styles'
import { db } from '@/db/client'
import { ADMIN_SESSION_DAYS } from '@/lib/auth/session-lifetimes'
import { getJoinUrl } from '@/lib/base-url'
import { getAdminTasting } from '@/lib/data'
import { joinQrSvg } from '@/lib/qr'
import { cn } from '@/lib/utils'
import { countWines } from '@/server/wines'

export const metadata: Metadata = { title: 'Teilen · Verwaltung' }

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const url = await getJoinUrl(tasting.code)
  const svg = await joinQrSvg(url)
  const wineCount = tasting.status === 'setup' ? await countWines(db, tasting.id) : 0

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start lg:gap-12">
      <JoinQr svg={svg} url={url} className="mx-auto w-full max-w-[280px] rounded-xl lg:max-w-[360px]" />
      <div className="grid gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Code</p>
          <div className="mt-1 flex items-center gap-2">
            <p className="font-mono text-4xl tracking-[0.3em]">{tasting.code}</p>
            <CopyCodeButton code={tasting.code} size="lg" />
          </div>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Link</p>
          <p className="mt-1 text-sm break-all">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyLinkButton url={url} />
          </div>
          <Link
            href={`/tasting/${tasting.code}/table`}
            target="_blank"
            className={cn('mt-2', textLink)}
          >
            Tisch-Ansicht öffnen
          </Link>
          <p className="text-sm text-muted-foreground">Für ein iPad oder einen Fernseher am Tisch – ohne Beitritt.</p>
        </div>
        {tasting.status === 'setup' && (
          // Right after creating: how to get back in tomorrow, and what comes next
          <div className={marginNote}>
            <p>
              Merk dir den Code <span className="font-mono font-medium text-foreground">{tasting.code}</span> und deine
              PIN. Auf diesem Gerät bleibst du {ADMIN_SESSION_DAYS} Tage angemeldet.
            </p>
            {wineCount === 0 ? (
              <p>
                Als Nächstes:{' '}
                <Link
                  href={`/tasting/${tasting.code}/admin/wines`}
                  className={cn(textLink, textLinkFocus, 'text-foreground')}
                >
                  Trag deine Weine ein
                </Link>
              </p>
            ) : (
              <p className="mt-1">Wenn alle da sind: Tasting starten.</p>
            )}
          </div>
        )}
        <HostStatusControl tasting={tasting} />
      </div>
    </div>
  )
}
