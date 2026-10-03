'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { copyText } from '@/lib/clipboard'
import { cn } from '@/lib/utils'

/** Small copy icon right after the tasting code; turns into a check mark for a moment. */
export function CopyCodeButton({ code, size = 'sm', className }: { code: string; size?: 'sm' | 'lg'; className?: string }) {
  const [copied, setCopied] = useState(false)
  const label = copied ? 'Code kopiert' : 'Code kopieren'
  const Icon = copied ? Check : Copy

  return (
    <>
      <button
        type="button"
        aria-label={label}
        title={label}
        onClick={async () => {
          if (!(await copyText(code))) return
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        }}
        // 48 px tap area, pulled in with negative margins so the icon sits right next to the code
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-full text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
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
