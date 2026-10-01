import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { AdminNav } from '@/components/admin/admin-nav'
import { requireAdmin } from '@/lib/auth/admin-session'
import { getTasting } from '@/lib/data'
import { STATUS_LABELS } from '@/lib/tasting/rules'

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  if (tasting.code !== code) redirect(`/tasting/${tasting.code}/admin`)
  await requireAdmin(tasting)

  return (
    <div className="mx-auto w-full max-w-[1100px] px-4 pt-4 pb-24 sm:px-6 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-x-12 lg:pt-8">
      <header className="mb-6 lg:col-span-2 lg:mb-10">
        <p className="font-mono text-xs tracking-[0.3em] text-muted-foreground">{tasting.code}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <h1 className="font-display text-3xl leading-tight lg:text-4xl">{tasting.name}</h1>
          <span className="rounded-full bg-card px-3 py-1 text-xs font-medium">{STATUS_LABELS[tasting.status]}</span>
        </div>
      </header>
      <AdminNav code={tasting.code} />
      <section className="min-w-0">{children}</section>
    </div>
  )
}
