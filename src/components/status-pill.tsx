import type { TastingStatus } from '@/lib/tasting/rules'

const LABEL: Record<TastingStatus, string> = { setup: 'Vorbereitung', active: 'Live', finished: 'Endergebnis' }

export function StatusPill({ status }: { status: TastingStatus }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-md bg-card px-2 py-0.5 text-xs font-medium">
      {status === 'active' && <span className="live-dot size-2 rounded-full bg-wine" aria-hidden />}
      {LABEL[status]}
    </span>
  )
}
