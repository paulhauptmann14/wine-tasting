'use client'

import { useId } from 'react'
import { marginNote, textLink, textLinkFocus } from '@/components/styles'
import type { LabelLine } from '@/lib/label/lines'
import { cn } from '@/lib/utils'

export type LineField = 'name' | 'winery'

export const LABEL_LINES_HEADING = 'Auf dem Etikett gefunden – tipp an, wohin es gehört:'
export const WINERY_LIST_NOTE = 'steht in der Weingut-Liste'

const FIELDS: { field: LineField; label: string }[] = [
  { field: 'name', label: 'Name' },
  { field: 'winery', label: 'Weingut' },
]

/** Shown when a tap would overwrite what the host typed. */
export const fieldFilledNotice = (field: LineField) =>
  `${FIELDS.find((f) => f.field === field)?.label} ist schon ausgefüllt – erst leeren.`

/**
 * Lines read from the label, each with [Name] [Weingut]: on many labels it is unclear which line
 * is the wine and which the producer, so the host decides. Nothing is written until a button is tapped.
 */
export function LabelLines({
  lines,
  assigned,
  notice,
  noticeFor,
  onAssign,
  className,
}: {
  lines: LabelLine[]
  /** Which field each line (by its text) went into */
  assigned: Record<string, LineField | undefined>
  /** Why the last tap did nothing, e.g. "Name ist schon ausgefüllt – erst leeren." */
  notice: string
  /** Text of the line the notice belongs to: it shows up in that row, next to the tapped button */
  noticeFor: string
  onAssign: (line: LabelLine, field: LineField) => void
  className?: string
}) {
  const headingId = useId()
  if (lines.length === 0) return null
  return (
    <section aria-labelledby={headingId} className={cn('grid grid-cols-1 gap-1', className)}>
      <h3 id={headingId} className="text-sm text-muted-foreground">
        {LABEL_LINES_HEADING}
      </h3>
      <ul className="grid grid-cols-1 border-t border-border">
        {lines.map((line) => {
          const target = assigned[line.text]
          return (
            <li
              key={line.text}
              className="grid grid-cols-1 gap-x-4 border-b border-border py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0 py-1">
                <p className="font-display text-lg break-words">{line.text}</p>
                {line.inWineryList && <p className="text-sm text-muted-foreground">{WINERY_LIST_NOTE}</p>}
              </div>
              <div className="flex items-center gap-x-5">
                {FIELDS.map(({ field, label }) => (
                  <button
                    key={field}
                    type="button"
                    aria-pressed={target === field}
                    aria-label={`„${line.text}“ als ${label} übernehmen`}
                    onClick={() => onAssign(line, field)}
                    className={cn(textLink, textLinkFocus, 'min-w-12 justify-center', target === field && 'decoration-wine')}
                  >
                    {label}
                  </button>
                ))}
                {target && (
                  <span aria-hidden className="text-sm text-muted-foreground">
                    → {FIELDS.find((f) => f.field === target)?.label}
                  </span>
                )}
              </div>
              {/* Always rendered, so a screen reader announces the notice when it appears */}
              <p role="status" className={cn(line.text === noticeFor && notice && marginNote, 'min-h-0 sm:col-span-2')}>
                {line.text === noticeFor ? notice : ''}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
