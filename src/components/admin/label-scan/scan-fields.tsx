'use client'

import { textLink, textLinkFocus } from '@/components/styles'
import { prefillMessage, type PrefillOption, type PrefillPlan } from '@/lib/label/prefill'
import { cn } from '@/lib/utils'

export const SCAN_MARKER_TEXT = 'vom Etikett – bitte prüfen'

const count = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * Status line after a scan, e.g. "Etikett gelesen – 2 Felder ausgefüllt, 3 Zeilen zum Zuordnen",
 * naming only what happened. `plan.marked` must hold only the fields whose value this scan changed.
 */
export function scanSummary(plan: PrefillPlan): string {
  const suggestions = Object.values(plan.suggestions).reduce((sum, options) => sum + (options?.length ?? 0), 0)
  const parts = [
    plan.marked.length > 0 && `${count(plan.marked.length, 'Feld', 'Felder')} ausgefüllt`,
    plan.lines.length > 0 && `${count(plan.lines.length, 'Zeile', 'Zeilen')} zum Zuordnen`,
    suggestions > 0 && count(suggestions, 'Vorschlag', 'Vorschläge'),
  ].filter(Boolean)
  return parts.length > 0 ? `Etikett gelesen – ${parts.join(', ')}` : prefillMessage(plan)
}

/**
 * Classes for a field the scan filled in: a wine-red outline and a thicker left edge. The text
 * under the field (ScanMarkNote) carries the meaning, so the color is never the only cue.
 */
export function scanMarkClass(marked: boolean): string | undefined {
  return marked ? 'border-wine border-l-4' : undefined
}

/** "vom Etikett – bitte prüfen" under a prefilled field, with a "passt" button to confirm it. */
export function ScanMarkNote({
  id,
  label,
  marked,
  onConfirm,
}: {
  id: string
  /** Field name for the screen reader: "Name passt" */
  label: string
  marked: boolean
  onConfirm: () => void
}) {
  if (!marked) return null
  return (
    <div className="mt-1 flex items-center gap-3">
      <p id={id} className="text-sm text-muted-foreground">
        {SCAN_MARKER_TEXT}
      </p>
      <button
        type="button"
        aria-label={`${label} passt`}
        onClick={onConfirm}
        className={cn(textLink, textLinkFocus, 'min-w-12 justify-center px-1 text-sm')}
      >
        passt
      </button>
    </div>
  )
}

/** "Vielleicht: [A] [B]" – uncertain values as tap targets; nothing is written until one is tapped. */
export function ScanSuggestions({
  label,
  options,
  onPick,
}: {
  /** Field name for the screen reader: group "Vorschläge für Name" */
  label: string
  options?: PrefillOption[]
  /** Gets the button's form, so the caller can write into its field */
  onPick: (option: PrefillOption, form: HTMLFormElement | null) => void
}) {
  if (!options || options.length === 0) return null
  return (
    <div role="group" aria-label={`Vorschläge für ${label}`} className="mt-1 flex flex-wrap items-center gap-x-4">
      <span className="text-sm text-muted-foreground">Vielleicht:</span>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={(e) => onPick(option, e.currentTarget.form)}
          className={cn(textLink, textLinkFocus, 'max-w-full min-w-12 justify-center text-left')}
        >
          <span className="truncate">
            {option.label}
            {option.hint && (
              <>
                {' '}
                <span className="font-normal text-muted-foreground">({option.hint})</span>
              </>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}
