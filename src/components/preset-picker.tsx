'use client'

import { useState } from 'react'
import { FieldError } from '@/components/field-error'
import { ScoringExplainer } from '@/components/scoring-explainer'
import { PRESET_KEYS, PRESETS, type PresetKey } from '@/lib/tasting/presets'

/**
 * Rating system choice (radio list) with the "So wird gerechnet" preview of the selected one.
 * Used when creating a tasting and when the host switches the system later.
 * Radios are named `name` so inside a form the choice is submitted; `onSelect` mirrors it for callers.
 */
export function PresetPicker({
  legend = 'Bewertungssystem',
  hint,
  defaultValue = null,
  onSelect,
  errors,
  explainerTitle = 'So wird gerechnet',
  name = 'preset',
}: {
  legend?: string
  hint?: string
  /** null = nothing selected yet (e.g. the tasting uses customized criteria) */
  defaultValue?: PresetKey | null
  onSelect?: (key: PresetKey) => void
  errors?: string[]
  explainerTitle?: string
  name?: string
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
            className="flex min-h-14 cursor-pointer flex-col justify-center rounded-xl border border-border bg-background/40 px-4 py-3 lg:bg-card transition-[border-color,transform] duration-100 ease-out active:scale-[0.99] has-[:checked]:border-wine has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring"
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
            <span className="font-medium">{PRESETS[key].label}</span>
            <span className="text-sm text-muted-foreground">{PRESETS[key].hint}</span>
            <span className="mt-1 text-sm">{PRESETS[key].criteria.map((c) => c.name).join(' · ')}</span>
          </label>
        ))}
      </div>
      <FieldError errors={errors} />
      {selected && PRESETS[selected] && (
        <div className="mt-6">
          <p className="text-sm font-medium">{explainerTitle}</p>
          <ScoringExplainer scale={PRESETS[selected].scale} criteria={PRESETS[selected].criteria} className="mt-2" />
        </div>
      )}
    </fieldset>
  )
}
