import Link from 'next/link'
import { CornerStain } from '@/components/corner-stain'
import { JoinByCodeForm } from '@/components/join-by-code-form'
import { PageShell } from '@/components/page-shell'

export default function NotFound() {
  return (
    <PageShell>
      <div className="relative">
        <CornerStain seed={11} />
        <h1 className="relative pt-28 font-display text-4xl leading-[1.08] font-medium tracking-tight lg:pt-16">
          Tasting nicht gefunden
        </h1>
        <p className="relative mt-3 max-w-[34ch] text-muted-foreground">
          Prüf den Code oder frag den Gastgeber nach dem QR-Code.
        </p>
        <JoinByCodeForm className="relative mt-8" />
      </div>
      <Link href="/" className="mt-8 inline-flex h-12 items-center text-sm text-muted-foreground hover:text-foreground">
        ‹ Zur Startseite
      </Link>
    </PageShell>
  )
}
