import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Way into the admin area, visible to everyone: if the device isn't signed in, the admin page
 * redirects to the PIN prompt with the code prefilled. So the host can get in from a guest phone too.
 */
export function AdminLink({ code, className }: { code: string; className?: string }) {
  return (
    <Link
      href={`/tasting/${code}/admin`}
      className={cn(
        'inline-flex h-12 items-center gap-1.5 text-sm text-muted-foreground outline-none transition-opacity duration-100 hover:text-foreground active:opacity-50 focus-visible:text-foreground focus-visible:underline',
        className,
      )}
    >
      <Settings2 className="size-4" aria-hidden />
      Verwaltung
    </Link>
  )
}
