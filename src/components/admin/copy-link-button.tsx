'use client'

import { Button } from '@/components/ui/button'
import { useCopy } from '@/components/use-copy'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, copy] = useCopy()
  return (
    <Button
      type="button"
      variant="secondary"
      size="lg"
      className="h-12"
      onClick={() => copy(url)}
    >
      <span aria-live="polite">{copied ? 'Link kopiert' : 'Link kopieren'}</span>
    </Button>
  )
}
