'use client'

import { useId, useMemo, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { searchWineries } from '@/lib/wineries/match'

let loading: Promise<string[]> | null = null

/** The self-hosted winery list, fetched once per page load. Failure is silent (free text still works). */
export function loadWineries(): Promise<string[]> {
  loading ??= fetch('/data/wineries.json')
    .then((res) => (res.ok ? (res.json() as Promise<unknown>) : []))
    .then((data) => (Array.isArray(data) ? data.filter((n): n is string => typeof n === 'string') : []))
    .catch(() => [])
    .then((list) => {
      if (list.length === 0) loading = null
      return list
    })
  return loading
}

type Props = Omit<ComponentProps<typeof Input>, 'list' | 'onChange' | 'value' | 'defaultValue'> & {
  defaultValue?: string
  /** Controlled value; when set, the parent owns the text. */
  value?: string
  onValueChange?: (value: string) => void
}

/**
 * Winery text field with suggestions from a self-hosted list. Uses the native
 * <datalist> (works on iOS Safari and Android Chrome); free text always stays allowed.
 * Without `value` the input stays uncontrolled like the other form fields, so React's form
 * reset after an action and a scripted prefill work the same way.
 */
export function WineryInput({ defaultValue = '', value, onValueChange, onFocus, ...props }: Props) {
  const listId = useId()
  const [inner, setInner] = useState(defaultValue)
  const [list, setList] = useState<string[]>([])
  const controlled = value !== undefined
  const text = controlled ? value : inner
  const options = useMemo(() => searchWineries(text, list, 6), [text, list])

  return (
    <>
      <Input
        {...props}
        {...(controlled ? { value } : { defaultValue })}
        list={listId}
        autoComplete="off"
        onFocus={(e) => {
          onFocus?.(e)
          void loadWineries().then(setList)
        }}
        onChange={(e) => {
          setInner(e.target.value)
          onValueChange?.(e.target.value)
        }}
      />
      <datalist id={listId}>
        {options.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
    </>
  )
}
