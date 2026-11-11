'use client'

import { useActionState, type ReactNode, useEffect, useRef, useState } from 'react'
import { applyPresetAction } from '@/app/tasting/[code]/admin/actions'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { PresetPicker } from '@/components/preset-picker'
import { marginNote, textLink, textLinkFocus } from '@/components/styles'
import { buttonVariants } from '@/components/ui/button'
import { detectPreset, PRESETS, ratingSystemLabel, type PresetKey, type Scale } from '@/lib/tasting/presets'
import { cn } from '@/lib/utils'

type CriterionShape = { name: string; weight: number }


/** The picker plus "System übernehmen" with a confirmation: the chosen system replaces all criteria. */
function ChangeForm({
  code,
  current,
  onCancel,
  onDone,
}: {
  code: string
  current: PresetKey | null
  onCancel: () => void
  onDone: () => void
}) {
  const [state, formAction, pending] = useActionState(applyPresetAction.bind(null, code), undefined)
  const [selected, setSelected] = useState<PresetKey | null>(current)
  const rootRef = useRef<HTMLDivElement>(null)
  // Choosing the system that is already in place has nothing to apply
  const unchanged = selected === null || selected === current

  // The "Ändern" link is gone now: move the focus into the picker
  useEffect(() => {
    const radios = rootRef.current?.querySelectorAll<HTMLInputElement>('input[type=radio]')
    ;(Array.from(radios ?? []).find((r) => r.checked) ?? radios?.[0])?.focus()
  }, [])

  useEffect(() => {
    if (state?.ok) onDone()
  }, [state, onDone])

  return (
    <div ref={rootRef} className="grid grid-cols-1 gap-6">
      <PresetPicker
        legend="Neues Bewertungssystem"
        defaultValue={current}
        onSelect={setSelected}
        explainerTitle="So würde gerechnet"
      />
      <p role="alert" className="text-sm text-destructive">
        {state?.message}
      </p>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
        <ConfirmSubmit
          action={(fd) => formAction(fd)}
          trigger="System übernehmen"
          triggerClassName={buttonVariants({ size: 'lg', className: 'h-12 px-6 text-base' })}
          disabled={unchanged || pending}
          title={selected ? `Auf „${PRESETS[selected].label}“ wechseln?` : 'Bewertungssystem wechseln?'}
          description="Deine Kriterien werden durch die des neuen Systems ersetzt."
          confirmLabel="Kriterien ersetzen"
          hiddenFields={{ preset: selected ?? '' }}
        />
        <button type="button" onClick={onCancel} disabled={pending} className={cn(textLink, textLinkFocus)}>
          Abbrechen
        </button>
        <span aria-live="polite" className="text-sm text-muted-foreground">
          {pending ? 'Wird übernommen …' : ''}
        </span>
      </div>
    </div>
  )
}

/**
 * "Bewertungssystem: <name>" on the criteria page. While the tasting is in setup and nobody has rated,
 * a text link opens the picker to switch the system (the server enforces both conditions again).
 */
export function RatingSystem({
  code,
  scale,
  criteria,
  locked,
  hasRatings,
  children,
}: {
  code: string
  scale: Scale
  criteria: readonly CriterionShape[]
  locked: boolean
  hasRatings: boolean
  /** The rest of the criteria page; hidden while the picker is open so only one main action shows */
  children?: ReactNode
}) {
  const [editing, setEditing] = useState(false)
  const [changed, setChanged] = useState(false)
  const openRef = useRef<HTMLButtonElement>(null)
  const wasEditing = useRef(false)
  const canChange = !locked && !hasRatings

  // Hand the focus back to "Ändern" once the picker closes
  useEffect(() => {
    if (wasEditing.current && !editing) openRef.current?.focus()
    wasEditing.current = editing
  }, [editing])

  return (
    <>
      <section aria-labelledby="rating-system-heading" className="grid max-w-xl grid-cols-1 gap-4">
        <div className="flex flex-wrap items-center gap-x-4">
          <p id="rating-system-heading">
            <span className="text-muted-foreground">Bewertungssystem: </span>
            <span className="font-medium">{ratingSystemLabel(scale, criteria)}</span>
          </p>
          {canChange && !editing && (
            <button
              ref={openRef}
              type="button"
              onClick={() => {
                setChanged(false)
                setEditing(true)
              }}
              className={cn(textLink, textLinkFocus)}
            >
              Ändern
            </button>
          )}
          <span aria-live="polite" className="text-sm text-muted-foreground">
            {changed && !editing ? 'Bewertungssystem geändert.' : ''}
          </span>
        </div>
        {!locked && hasRatings && (
          <p className={marginNote}>
            Es gibt schon Bewertungen, deshalb lässt sich das System nicht mehr wechseln.
          </p>
        )}
        {canChange && editing && (
          <ChangeForm
            code={code}
            current={detectPreset(scale, criteria)}
            onCancel={() => setEditing(false)}
            onDone={() => {
              setChanged(true)
              setEditing(false)
            }}
          />
        )}
      </section>
      <div className={editing ? 'hidden' : 'contents'}>
        {children}
      </div>
    </>
  )
}
