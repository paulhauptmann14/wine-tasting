import type { ReactNode } from 'react'

/** Gäste-Ansicht: ab lg Weinliste links, Inhalt rechts. Mobil nur Inhalt. */
export function TastingSplit({ aside, children }: { aside: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pt-4 pb-32 sm:px-6 lg:grid lg:max-w-[1100px] lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-12 lg:pt-12 lg:pb-12">
      <aside className="hidden lg:block" aria-label="Weine">
        <div className="sticky top-12">{aside}</div>
      </aside>
      <div className="min-w-0">{children}</div>
    </main>
  )
}
