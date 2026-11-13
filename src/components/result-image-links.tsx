import { textLink, textLinkFocus } from '@/components/styles'
import { rankingImageUrl } from '@/lib/tasting/ranking-card'
import { cn } from '@/lib/utils'

/**
 * Plain links to look at the images of a long ranking one by one. They sit in the page flow below
 * <BottomBar>: in the fixed bar on phones they would squeeze the button, and the bar can't grow
 * without covering the footer links. A single image keeps its "Bild öffnen" link in the bar.
 */
export function ResultImageLinks({ code, imageCount, className }: { code: string; imageCount: number; className?: string }) {
  if (imageCount <= 1) return null
  return (
    <div className={cn('flex flex-wrap items-center gap-x-6', className)}>
      <span className="text-sm text-muted-foreground">Einzeln öffnen:</span>
      {Array.from({ length: imageCount }, (_, i) => (
        <a key={i} href={rankingImageUrl(code, i + 1)} target="_blank" rel="noopener" className={cn(textLink, textLinkFocus)}>
          {`Bild ${i + 1}`}
        </a>
      ))}
    </div>
  )
}
