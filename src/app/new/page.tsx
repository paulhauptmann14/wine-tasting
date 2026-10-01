import type { Metadata } from 'next'
import Link from 'next/link'
import { CreateTastingForm } from '@/components/create-tasting-form'
import { PageShell } from '@/components/page-shell'

export const metadata: Metadata = { title: 'Tasting erstellen · Wine Tasting' }

export default function NewTastingPage() {
  return (
    <PageShell>
      <Link href="/" className="inline-flex h-12 items-center text-sm text-muted-foreground hover:text-foreground">
        ‹ Zurück
      </Link>
      <h1 className="mt-2 mb-8 font-display text-4xl leading-tight">Neues Tasting</h1>
      <CreateTastingForm />
    </PageShell>
  )
}
