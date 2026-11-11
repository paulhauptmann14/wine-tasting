import Link from 'next/link'
import { CornerStain } from '@/components/corner-stain'
import { JoinByCodeForm } from '@/components/join-by-code-form'
import { PageShell } from '@/components/page-shell'
import { backLink } from '@/components/styles'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <PageShell>
      <div className="relative">
        <CornerStain seed={11} />
        <h1 className="relative pt-28 font-display text-4xl md:text-5xl leading-[1.08] font-medium tracking-tight lg:pt-16 lg:text-6xl lg:leading-[1.02]">
          Tasting nicht gefunden
        </h1>
        <p className="relative mt-3 max-w-[34ch] text-muted-foreground">
          Prüf den Code oder frag den Gastgeber nach dem QR-Code.
        </p>
        <JoinByCodeForm className="relative mt-8 lg:max-w-md" layout="row" />
      </div>
      <Link href="/" className={cn('mt-8', backLink)}>
        ‹ Zur Startseite
      </Link>
    </PageShell>
  )
}
