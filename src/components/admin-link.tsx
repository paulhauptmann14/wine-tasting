import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Rückweg in die Verwaltung – nur für den Gastgeber, wenn er selbst mitbewertet. */
export function AdminLink({ code, className }: { code: string; className?: string }) {
  return (
    <Link
      href={`/tasting/${code}/admin`}
      className={cn(
        'inline-flex h-12 items-center gap-1.5 text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground focus-visible:underline',
        className,
      )}
    >
      <Settings2 className="size-4" aria-hidden />
      Verwaltung
    </Link>
  )
}
