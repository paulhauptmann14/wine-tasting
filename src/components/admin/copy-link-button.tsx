'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { copyText } from '@/lib/clipboard'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="h-12"
      onClick={async () => {
        if (!(await copyText(url))) return
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      <span aria-live="polite">{copied ? 'Link kopiert' : 'Link kopieren'}</span>
    </Button>
  )
}
