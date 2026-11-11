'use client'

import { PageShell } from '@/components/page-shell'
import { Button } from '@/components/ui/button'

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <PageShell>
      <h1 className="font-display text-4xl md:text-5xl leading-tight lg:pt-16 lg:text-6xl lg:leading-[1.02] lg:font-medium lg:tracking-tight">Da ist etwas schiefgelaufen.</h1>
      <p className="mt-3 text-muted-foreground">Die Seite konnte nicht geladen werden. Versuch es noch einmal.</p>
      <Button size="lg" className="mt-8 h-14 w-full text-base lg:w-auto lg:px-10" onClick={() => retry()}>
        Nochmal versuchen
      </Button>
    </PageShell>
  )
}
