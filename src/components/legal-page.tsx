import type { ReactNode } from 'react'
import Link from 'next/link'

/** Reading layout for Impressum and privacy policy: one comfortable column, plain hierarchy. */
export function LegalPage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[480px] px-4 pt-6 pb-16 sm:max-w-[720px] sm:px-6 lg:pt-4">
      <Link
        href="/"
        className="inline-flex h-12 items-center text-sm text-muted-foreground transition-opacity duration-100 hover:text-foreground active:opacity-50"
      >
        ‹ Zur Startseite
      </Link>
      <h1 className="mt-2 font-display text-4xl leading-tight md:text-5xl">{title}</h1>
      <div className="mt-8 grid max-w-[65ch] gap-4 leading-relaxed [&_a]:underline [&_a]:decoration-border [&_a]:underline-offset-4 [&_a:hover]:decoration-wine [&_h2]:mt-6 [&_h2]:font-display [&_h2]:text-2xl [&_h2]:leading-tight [&_li]:ml-5 [&_li]:list-disc [&_ul]:grid [&_ul]:gap-1.5">
        {children}
      </div>
    </main>
  )
}
