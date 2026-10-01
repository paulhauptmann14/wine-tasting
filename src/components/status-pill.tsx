import type { TastingStatus } from '@/lib/tasting/rules'

const LABEL: Record<TastingStatus, string> = { setup: 'Vorbereitung', active: 'Live', finished: 'Endergebnis' }

export function StatusPill({ status }: { status: TastingStatus }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-card px-3 py-1 text-xs font-medium">
      {status === 'active' && <span className="live-dot size-2 rounded-full bg-stroh" aria-hidden />}
      {LABEL[status]}
    </span>
  )
}
