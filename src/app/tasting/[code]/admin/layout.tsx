import type { ReactNode } from 'react'
import Link from 'next/link'
import { Wine } from 'lucide-react'
import { AdminNav } from '@/components/admin/admin-nav'
import { TastingCode } from '@/components/tasting-code'
import { buttonVariants } from '@/components/ui/button'
import { requireAdmin } from '@/lib/auth/admin-session'
import { requireTasting } from '@/lib/data'
import { SITE_FRAME_CLASSES } from '@/lib/site-frame'
import { STATUS_LABELS } from '@/lib/tasting/rules'
import { cn } from '@/lib/utils'

export default async function AdminLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const tasting = await requireTasting(code, '/admin')
  await requireAdmin(tasting)

  return (
    <main
      className={cn(
        'mx-auto w-full pt-4 pb-24 lg:grid lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-x-12 lg:pt-8',
        SITE_FRAME_CLASSES.admin,
      )}
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 lg:col-span-2 lg:mb-10">
        <div className="min-w-0">
          <TastingCode code={tasting.code} />
          <div className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <h1 className="font-display text-3xl leading-tight md:text-4xl">{tasting.name}</h1>
            <span className="rounded-md bg-card px-2 py-0.5 text-xs font-medium">
              {STATUS_LABELS[tasting.status]}
            </span>
          </div>
        </div>
        {/* The host can enter the tasting at any time – join, rate or view results */}
        <Link
          href={`/tasting/${tasting.code}`}
          className={cn(buttonVariants({ variant: 'secondary', size: 'lg' }), 'h-12 w-full gap-2 sm:w-auto')}
        >
          <Wine className="size-4" aria-hidden />
          Zum Tasting
        </Link>
      </header>
      <AdminNav code={tasting.code} />
      <section className="min-w-0">{children}</section>
    </main>
  )
}
