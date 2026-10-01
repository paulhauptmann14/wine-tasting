'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="h-12"
      onClick={async () => {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
    >
      <span aria-live="polite">{copied ? 'Link kopiert' : 'Link kopieren'}</span>
    </Button>
  )
}
