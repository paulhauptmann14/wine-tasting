import Link from 'next/link'
import { CornerStain } from '@/components/corner-stain'
import { GlassRing } from '@/components/glass-ring'
import { JoinByCodeForm } from '@/components/join-by-code-form'

const textLink =
  'inline-flex h-12 items-center font-medium underline decoration-border decoration-2 underline-offset-[6px] outline-none hover:decoration-wine focus-visible:decoration-wine'

/** Ablauf eines Abends – nur auf breiten Bildschirmen, dort sitzt meist der Gastgeber. */
const STEPS = [
  'Weine und Kriterien eintragen',
  'Gäste scannen den QR-Code oder tippen den Code',
  'Alle bewerten mit Sternen, die Ergebnisse laufen live mit',
  'Am Ende auflösen – mit Podest und Notizen',
]

export default function HomePage() {
  return (
    // Handy: schmaler Bogen. Laptop: aufgeschlagen in zwei Spalten statt einer Karte in der Mitte
    <main className="mx-auto w-full max-w-[480px] px-4 pt-6 pb-32 sm:px-6 lg:max-w-[1100px] lg:pt-4 lg:pb-16">
      <div className="relative">
        <div className="lg:hidden">
          <CornerStain seed={5} />
        </div>
        {/* Großer Abdruck unter der Kopfzeile, am rechten Bildschirmrand angeschnitten */}
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
            <div className="mt-1 flex flex-wrap gap-x-8">
              <Link href="/new" className={textLink}>
                Tasting erstellen
              </Link>
              <Link href="/manage" className={textLink}>
                Tasting verwalten
              </Link>
            </div>

            <div className="mt-12 hidden lg:block">
              <h3 className="text-sm text-muted-foreground">So läuft ein Abend</h3>
              <ol className="mt-3 border-t border-border">
                {STEPS.map((step, i) => (
                  <li key={step} className="flex gap-4 border-b border-border py-3">
                    <span className="w-4 shrink-0 font-display text-muted-foreground">{i + 1}</span>
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
