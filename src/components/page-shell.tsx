import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/** narrow: Formulare und Einstiege – ab lg als zentrierte Karte. wide: Ergebnisse. */
export function PageShell({ children, width = 'narrow' }: { children: ReactNode; width?: 'narrow' | 'wide' }) {
  return (
    <main
      className={cn(
        'mx-auto w-full max-w-[480px] px-4 pt-6 pb-32 sm:px-6 lg:pb-12',
        width === 'narrow' && 'lg:mt-16 lg:mb-16 lg:overflow-hidden lg:rounded-3xl lg:bg-card lg:p-10',
        width === 'wide' && 'lg:max-w-[960px] lg:pt-12',
      )}
    >
      {children}
    </main>
  )
}
