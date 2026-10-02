import Link from 'next/link'
import { Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Weg in die Verwaltung, für alle sichtbar: Ist das Gerät nicht angemeldet, leitet die Admin-Seite
 * zur PIN-Abfrage mit vorausgefülltem Code weiter. So kommt der Gastgeber auch vom Gäste-Handy hinein.
 */
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
