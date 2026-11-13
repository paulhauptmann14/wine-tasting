import Link from 'next/link'
import { JoinByCodeForm } from '@/components/join-by-code-form'
import { PageShell } from '@/components/page-shell'
import { backLink } from '@/components/styles'
import { IntroNote, TastingIntro } from '@/components/tasting-intro'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <PageShell>
      <TastingIntro title="Tasting nicht gefunden" seed={11}>
        <IntroNote className="mt-3">Prüf den Code oder frag den Gastgeber nach dem QR-Code.</IntroNote>
        <JoinByCodeForm className="relative mt-8 lg:max-w-md" layout="row" />
      </TastingIntro>
      <Link href="/" className={cn('mt-8', backLink)}>
        ‹ Zur Startseite
      </Link>
    </PageShell>
  )
}
