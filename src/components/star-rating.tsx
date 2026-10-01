'use client'

import { useId, useRef, type KeyboardEvent } from 'react'
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
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const steps = Array.from({ length: max - min + 1 }, (_, i) => min + i)

  function select(next: number) {
    const clamped = Math.min(max, Math.max(min, next))
    onChange(clamped)
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
    <div className="grid gap-1.5">
      <span id={labelId} className="text-sm font-medium">
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-invalid={invalid || undefined}
        onKeyDown={onKeyDown}
        className={cn('-ml-2 flex w-fit rounded-xl', invalid && 'ring-1 ring-destructive/70')}
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
              className="grid size-12 place-items-center rounded-full outline-none transition-transform focus-visible:ring-2 focus-visible:ring-ring active:scale-90"
            >
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className={cn('size-8 transition-colors', filled ? 'fill-star stroke-star-edge' : 'fill-none stroke-muted-foreground/70')}
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
