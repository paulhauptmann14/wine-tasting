import Link from 'next/link'
import { CornerStain } from '@/components/corner-stain'
import { JoinByCodeForm } from '@/components/join-by-code-form'
import { PageShell } from '@/components/page-shell'

const textLink =
  'inline-flex h-12 items-center font-medium underline decoration-border decoration-2 underline-offset-[6px] outline-none hover:decoration-wine focus-visible:decoration-wine'

export default function HomePage() {
  return (
    <PageShell>
      <div className="relative">
        <CornerStain seed={5} />
        <p className="relative font-display text-lg font-medium">Wine Tasting</p>

        <section aria-labelledby="join-heading" className="relative mt-24 lg:mt-20">
          <p className="text-sm text-muted-foreground">Eingeladen?</p>
          <h1 id="join-heading" className="mt-1 font-display text-4xl leading-[1.08] font-medium tracking-tight">
            Gib den Code vom Gastgeber ein.
          </h1>
          <JoinByCodeForm className="mt-6" />
        </section>

        <section aria-labelledby="host-heading" className="mt-20 border-t border-border pt-5">
          <h2 id="host-heading" className="text-sm text-muted-foreground">
            Du lädst selbst ein?
          </h2>
          <div className="mt-1 flex flex-wrap gap-x-8">
            <Link href="/new" className={textLink}>
              Tasting erstellen
            </Link>
            <Link href="/manage" className={textLink}>
              Tasting verwalten
            </Link>
          </div>
        </section>
      </div>
    </PageShell>
  )
}
