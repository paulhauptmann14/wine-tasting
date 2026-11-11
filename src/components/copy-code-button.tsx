'use client'

import { Check, Copy } from 'lucide-react'
import { useCopy } from '@/components/use-copy'
import { cn } from '@/lib/utils'

/** Small copy icon right after the tasting code; turns into a check mark for a moment. */
export function CopyCodeButton({ code, size = 'sm', className }: { code: string; size?: 'sm' | 'lg'; className?: string }) {
  const [copied, copy] = useCopy()
  const label = copied ? 'Code kopiert' : 'Code kopieren'
  const Icon = copied ? Check : Copy

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={() => copy(code)}
        // 48 px tap area, pulled in with negative margins so the icon sits right next to the code
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-[color,transform] duration-100 hover:text-foreground active:scale-90 focus-visible:ring-2 focus-visible:ring-ring',
          size === 'sm' ? '-mx-3 -my-3' : '-mx-2',
          copied && 'text-wine hover:text-wine',
          className,
        )}
      >
        <Icon className={size === 'sm' ? 'size-3.5' : 'size-5'} aria-hidden />
      </button>
      <span role="status" className="sr-only">
        {copied ? 'Code kopiert' : ''}
      </span>
    </>
  )
}
