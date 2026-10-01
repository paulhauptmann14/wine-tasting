import Link from 'next/link'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { StatusControl } from '@/components/admin/status-control'
import { buttonVariants } from '@/components/ui/button'
import { getBaseUrl } from '@/lib/base-url'
import { getTasting } from '@/lib/data'
import { cn } from '@/lib/utils'

export default async function SharePage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  const url = `${await getBaseUrl()}/tasting/${tasting.code}`
  // SVG wird von unserer eigenen Library aus unserer eigenen URL erzeugt
  const svg = await QRCode.toString(url, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#17141BFF', light: '#FFFFFFFF' },
  })

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,360px)_1fr] lg:items-start lg:gap-12">
      <div
        role="img"
        aria-label={`QR-Code für ${url}`}
        className="mx-auto w-full max-w-[280px] rounded-3xl bg-white p-4 lg:max-w-[360px] [&>svg]:h-auto [&>svg]:w-full"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <div className="grid gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Code</p>
          <p className="mt-1 font-mono text-4xl tracking-[0.3em]">{tasting.code}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Link</p>
          <p className="mt-1 font-mono text-sm break-all">{url}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <CopyLinkButton url={url} />
            <Link
              href={`/tasting/${tasting.code}`}
              className={cn(buttonVariants({ variant: 'ghost', size: 'lg' }), 'h-12')}
            >
              Selbst mitbewerten
            </Link>
          </div>
        </div>
        <StatusControl code={tasting.code} status={tasting.status} />
      </div>
    </div>
  )
}
