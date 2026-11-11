import Link from 'next/link'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { StatusControl } from '@/components/admin/status-control'
import { CopyCodeButton } from '@/components/copy-code-button'
import { getBaseUrl } from '@/lib/base-url'
import { getAdminTasting } from '@/lib/data'
import { joinQrSvg } from '@/lib/qr'

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const url = `${await getBaseUrl()}/tasting/${tasting.code}`
  const svg = await joinQrSvg(url)

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start lg:gap-12">
      <div
        role="img"
        aria-label={`QR-Code für ${url}`}
        className="mx-auto w-full max-w-[280px] rounded-xl bg-white p-4 lg:max-w-[360px] [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
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
          <p className="mt-1 font-mono text-sm break-all">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyLinkButton url={url} />
          </div>
          <Link
            href={`/tasting/${tasting.code}/table`}
            target="_blank"
            className="mt-2 inline-flex h-12 items-center font-medium underline decoration-border decoration-2 underline-offset-[6px] transition-opacity duration-100 hover:decoration-wine active:opacity-50"
          >
            Tisch-Ansicht öffnen
          </Link>
          <p className="text-sm text-muted-foreground">Für ein iPad oder einen Fernseher am Tisch – ohne Beitritt.</p>
        </div>
        <StatusControl code={tasting.code} status={tasting.status} />
      </div>
    </div>
  )
}
