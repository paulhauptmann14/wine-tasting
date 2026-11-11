import type { ReactNode } from 'react'
import Link from 'next/link'
import { backLink } from '@/components/styles'

/**
 * Host forms (create, sign in). Phone: one narrow column. Laptop: opened up like the home page –
 * title and explanation on the left, the form on the right of a fine rule.
 */
export function FormPage({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <main className="mx-auto w-full max-w-[480px] sm:max-w-[720px] px-4 pt-6 pb-32 sm:px-6 lg:grid lg:max-w-[1100px] lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-16 lg:pt-4 lg:pb-16">
      <div className="lg:sticky lg:top-8 lg:self-start">
        <Link href="/" className={backLink}>
          ‹ Zurück
        </Link>
        <h1 className="mt-2 font-display text-4xl md:text-5xl leading-tight lg:mt-16 lg:text-6xl lg:leading-[1.02] lg:font-medium lg:tracking-tight">
          {title}
        </h1>
        <div className="mt-2 mb-8 text-muted-foreground lg:mt-6 lg:mb-0 lg:max-w-[34ch]">{intro}</div>
      </div>
      <div className="lg:mt-28 lg:max-w-lg lg:border-l lg:border-border lg:pl-12">{children}</div>
    </main>
  )
}
