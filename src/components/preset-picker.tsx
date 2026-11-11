'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { FieldError } from '@/components/field-error'
import { ScoringExplainer } from '@/components/scoring-explainer'
import { PRESET_KEYS, PRESETS, type PresetKey } from '@/lib/tasting/presets'

/**
 * Rating system choice (radio list) with the "So wird gerechnet" preview of the selected one.
 * Used when creating a tasting and when the host switches the system later.
 * Radios are named `name` so inside a form the choice is submitted; `onSelect` mirrors it for callers.
 * The selected card shows a check mark, not just a coloured border.
 */
export function PresetPicker({
  legend = 'Bewertungssystem',
  hint,
  defaultValue = null,
  onSelect,
  errors,
  explainerTitle = 'So wird gerechnet',
  name = 'preset',
  recommended,
  collapseExplainer = false,
}: {
  legend?: string
  hint?: string
  /** null = nothing selected yet (e.g. the tasting uses customized criteria) */
  defaultValue?: PresetKey | null
  onSelect?: (key: PresetKey) => void
  errors?: string[]
  explainerTitle?: string
  name?: string
  /** Marked „Empfohlen“ next to its name */
  recommended?: PresetKey
  /** Fold the explanation into a <details> (when creating – most hosts don't need the maths) */
  collapseExplainer?: boolean
}) {
  const [selected, setSelected] = useState<PresetKey | null>(defaultValue)

  return (
    <fieldset>
      <legend className="text-sm font-medium">{legend}</legend>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-3 grid grid-cols-1 gap-2">
        {PRESET_KEYS.map((key) => (
          <label
            key={key}
            className="flex min-h-14 cursor-pointer items-center gap-3 rounded-xl border border-border bg-background/40 px-4 py-3 lg:bg-card transition-[border-color,transform] duration-100 ease-out active:scale-[0.99] has-[:checked]:border-wine has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
          >
            <input
              type="radio"
              name={name}
              value={key}
              defaultChecked={defaultValue === key}
              onChange={() => {
                setSelected(key)
                onSelect?.(key)
              }}
              className="sr-only"
            />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="font-medium">{PRESETS[key].label}</span>
                {recommended === key && <span className="text-sm text-wine">Empfohlen</span>}
              </span>
              <span className="text-sm text-muted-foreground">{PRESETS[key].hint}</span>
              <span className="mt-1 text-sm">{PRESETS[key].criteria.map((c) => c.name).join(' · ')}</span>
            </span>
            {/* Fixed slot so the text doesn't jump when the selection changes */}
            <span className="grid size-6 shrink-0 place-items-center">
              {selected === key && <Check data-slot="preset-check" aria-hidden className="size-5 text-wine" />}
            </span>
          </label>
        ))}
      </div>
      <FieldError errors={errors} />
      {selected &&
        PRESETS[selected] &&
        (collapseExplainer ? (
          <details className="group mt-4">
            <summary className="inline-flex h-12 cursor-pointer list-none items-center gap-2 text-sm font-medium outline-none focus-visible:underline [&::-webkit-details-marker]:hidden">
              {explainerTitle}
              <span aria-hidden className="text-muted-foreground transition-transform duration-200 group-open:rotate-90">
                ›
              </span>
            </summary>
            <ScoringExplainer scale={PRESETS[selected].scale} criteria={PRESETS[selected].criteria} className="mt-1" />
          </details>
        ) : (
          <div className="mt-6">
            <p className="text-sm font-medium">{explainerTitle}</p>
            <ScoringExplainer scale={PRESETS[selected].scale} criteria={PRESETS[selected].criteria} className="mt-2" />
          </div>
        ))}
    </fieldset>
  )
}
