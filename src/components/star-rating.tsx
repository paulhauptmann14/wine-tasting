'use client'

import { useId, useRef, useState, type KeyboardEvent } from 'react'
import { starLabel } from '@/lib/tasting/star-labels'
import { cn } from '@/lib/utils'

type StarRatingProps = {
  name: string
  label: string
  value: number | null
  onChange: (value: number) => void
  min?: number
  max?: number
  invalid?: boolean
}

export function StarRating({ name, label, value, onChange, min = 1, max = 5, invalid }: StarRatingProps) {
  const labelId = useId()
  const stageId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  // Restarts the pop on every tap, even on the same star
  const [pop, setPop] = useState<{ n: number; tick: number } | null>(null)
  const stage = starLabel(value, min, max)
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  function select(next: number) {
    const clamped = Math.min(max, Math.max(min, next))
    onChange(clamped)
    setPop((prev) => ({ n: clamped, tick: (prev?.tick ?? 0) + 1 }))
    refs.current[clamped - min]?.focus()
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      select((value ?? min - 1) + 1)
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      select((value ?? min + 1) - 1)
    }
  }

  return (
    // One row of the tasting sheet: criterion left, stars right, fine rule below
    <div className="flex flex-wrap items-center justify-between gap-x-3 border-b border-border py-1">
      <span className="grid">
        <span id={labelId} className={cn('text-[15px]', invalid && 'text-destructive')}>
          {label}
          {invalid && <span className="sr-only"> – bitte Sterne vergeben</span>}
        </span>
        {/* Always rendered, so the row doesn't grow when the first star is set */}
        <span id={stageId} aria-live="polite" className="min-h-[1.125rem] text-[13px] leading-[1.125rem] text-muted-foreground">
          {stage}
        </span>
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={stage ? stageId : undefined}
        aria-invalid={invalid || undefined}
        onKeyDown={onKeyDown}
        className="-mr-2 flex"
      >
        {steps.map((n) => {
          const filled = value !== null && n <= value
          const checked = value === n
          return (
            <button
              key={n}
              ref={(el) => {
                refs.current[n - min] = el
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              aria-label={`${n} von ${max} Sternen`}
              tabIndex={checked || (value === null && n === min) ? 0 : -1}
              onClick={() => select(n)}
              className="grid size-12 place-items-center rounded-full outline-none transition-transform duration-100 ease-out focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
            >
              <svg
                key={pop?.n === n ? pop.tick : undefined}
                viewBox="0 0 24 24"
                aria-hidden
                className={cn(
                  'size-7 transition-colors duration-150',
                  filled ? 'fill-star stroke-star-edge' : 'fill-none stroke-muted-foreground/70',
                  pop?.n === n && 'star-pop',
                )}
                strokeWidth={1.5}
                strokeLinejoin="round"
              >
                <path d="M12 2.8l2.84 5.76 6.36.92-4.6 4.49 1.09 6.33L12 17.31l-5.69 2.99 1.09-6.33-4.6-4.49 6.36-.92L12 2.8z" />
              </svg>
            </button>
          )
        })}
      </div>
      <input type="hidden" name={name} value={value ?? ''} />
    </div>
  )
}
