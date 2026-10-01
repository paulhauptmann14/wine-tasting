import Link from 'next/link'
import { GlassRing } from '@/components/glass-ring'
import { JoinByCodeForm } from '@/components/join-by-code-form'
import { PageShell } from '@/components/page-shell'

export default function NotFound() {
  return (
    <PageShell>
      <div className="flex flex-col items-center pt-6 text-center lg:pt-0">
        <GlassRing seed={11} state="open" size={88} />
        <h1 className="mt-6 font-display text-4xl leading-tight">Tasting nicht gefunden</h1>
        <p className="mt-3 max-w-[32ch] text-muted-foreground">
          Prüf den Code oder frag den Gastgeber nach dem QR-Code.
        </p>
      </div>
      <JoinByCodeForm className="mt-10" />
      <Link href="/" className="mt-8 inline-flex h-12 items-center text-sm text-muted-foreground hover:text-foreground">
        ‹ Zur Startseite
      </Link>
    </PageShell>
  )
}
