import type { Metadata } from 'next'
import Link from 'next/link'
import { ManageLoginForm } from '@/components/manage-login-form'
import { PageShell } from '@/components/page-shell'

export const metadata: Metadata = { title: 'Tasting verwalten · Wine Tasting' }

export default async function ManagePage({ searchParams }: { searchParams: Promise<{ code?: string }> }) {
  const { code } = await searchParams
  return (
    <PageShell>
      <Link href="/" className="inline-flex h-12 items-center text-sm text-muted-foreground hover:text-foreground">
        ‹ Zurück
      </Link>
      <h1 className="mt-2 font-display text-4xl leading-tight">Tasting verwalten</h1>
      <p className="mt-2 mb-8 text-muted-foreground">Mit dem Code und der PIN, die du beim Erstellen vergeben hast.</p>
      <ManageLoginForm defaultCode={code} />
    </PageShell>
  )
}
