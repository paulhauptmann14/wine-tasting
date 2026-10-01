import Link from 'next/link'
import { GlassRing } from '@/components/glass-ring'
import { JoinByCodeForm } from '@/components/join-by-code-form'
import { PageShell } from '@/components/page-shell'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function HomePage() {
  return (
    <PageShell>
      <div className="flex flex-col items-center pt-6 text-center lg:pt-0">
        <GlassRing seed={3} size={112} />
        <h1 className="mt-6 font-display text-5xl leading-none tracking-tight">Wine Tasting</h1>
        <p className="mt-3 max-w-[30ch] text-muted-foreground">Weine verkosten, Sterne vergeben, gemeinsam auflösen.</p>
      </div>

      <section className="mt-12" aria-labelledby="join-heading">
        <h2 id="join-heading" className="text-sm font-medium text-muted-foreground">
          Du bist eingeladen? Gib den Code ein.
        </h2>
        <JoinByCodeForm className="mt-3" />
      </section>

      <div className="mt-10 grid gap-3">
        <Link href="/new" className={cn(buttonVariants({ size: 'lg' }), 'h-14 text-base')}>
          Tasting erstellen
        </Link>
        <Link href="/manage" className={cn(buttonVariants({ size: 'lg', variant: 'secondary' }), 'h-14 text-base')}>
          Tasting verwalten
        </Link>
      </div>
    </PageShell>
  )
}
