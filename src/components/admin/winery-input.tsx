'use client'

import { useId, useMemo, useState, type ComponentProps } from 'react'
import { Input } from '@/components/ui/input'
import { loadWineries } from '@/lib/wineries/load'
import { searchWineries } from '@/lib/wineries/match'

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
          // The form reset after an action and the label scan change the text without onChange
          if (!controlled) setInner(e.currentTarget.value)
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
