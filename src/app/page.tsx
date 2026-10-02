import Link from 'next/link'
import { CornerStain } from '@/components/corner-stain'
import { GlassRing } from '@/components/glass-ring'
import { JoinByCodeForm } from '@/components/join-by-code-form'
import { cn } from '@/lib/utils'

const textLink =
  'inline-flex h-12 items-center font-medium underline decoration-border decoration-2 underline-offset-[6px] outline-none hover:decoration-wine focus-visible:decoration-wine'
/** Laptop: host actions as large rows instead of small text links */
const hostLink = cn(
  textLink,
  'group lg:h-16 lg:w-full lg:justify-between lg:border-b lg:border-border lg:font-display lg:text-2xl lg:no-underline lg:hover:text-wine lg:focus-visible:text-wine',
)

/** How an evening works – wide screens only, that's usually where the host sits. */
const STEPS = [
  'Weine und Kriterien eintragen',
  'Gäste scannen den QR-Code oder tippen den Code',
  'Alle bewerten mit Sternen, die Ergebnisse laufen live mit',
  'Am Ende auflösen – mit Podest und Notizen',
]

function Arrow() {
  return (
    <span
      aria-hidden
      className="hidden text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-wine motion-reduce:transition-none lg:inline"
    >
      →
    </span>
  )
}

export default function HomePage() {
  return (
    // Phone: narrow sheet. Laptop: opened up into two columns instead of a centered card
    <main className="mx-auto w-full max-w-[480px] px-4 pt-6 pb-32 sm:px-6 lg:max-w-[1100px] lg:pt-4 lg:pb-16">
      <div className="relative">
        <div className="lg:hidden">
          <CornerStain seed={5} />
        </div>
        {/* Large stain below the header, cropped at the right edge of the screen */}
        <GlassRing
          seed={5}
          size={300}
          className="pointer-events-none absolute top-0 right-[calc((100%-100vw)/2-120px)] hidden xl:inline-grid"
        />

        <p className="relative font-display text-lg font-medium">Wine Tasting</p>

        <div className="lg:mt-28 lg:grid lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-16">
          <section aria-labelledby="join-heading" className="relative mt-24 lg:mt-0">
            <p className="text-sm text-muted-foreground">Eingeladen?</p>
            <h1
              id="join-heading"
              className="mt-1 font-display text-4xl leading-[1.08] font-medium tracking-tight lg:max-w-[14ch] lg:text-6xl lg:leading-[1.02]"
            >
              Gib den Code vom Gastgeber ein.
            </h1>
            <JoinByCodeForm className="mt-6 lg:mt-10 lg:max-w-md" layout="row" />
          </section>

          <section
            aria-labelledby="host-heading"
            className="mt-20 border-t border-border pt-5 lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12"
          >
            <h2 id="host-heading" className="text-sm text-muted-foreground">
              Du lädst selbst ein?
            </h2>
            <div className="mt-1 flex flex-wrap gap-x-8 lg:mt-3 lg:flex-col lg:border-t lg:border-border">
              <Link href="/new" className={hostLink}>
                Tasting erstellen
                <Arrow />
              </Link>
              <Link href="/manage" className={hostLink}>
                Tasting verwalten
                <Arrow />
              </Link>
            </div>

            <div className="mt-14 hidden lg:block">
              <h3 className="text-sm text-muted-foreground">So läuft ein Abend</h3>
              <ol className="mt-2 grid gap-1.5 text-sm text-muted-foreground">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="w-3 shrink-0">{i + 1}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
