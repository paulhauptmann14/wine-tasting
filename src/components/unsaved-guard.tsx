'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import Link from 'next/link'

const HINT_MS = 3500

export const UNSAVED_HINT = 'Speichere erst – sonst gehen deine Sterne verloren.'

type Guard = {
  /** Shows the hint (swipe) – and counts as the warning for the next tap on a link */
  warn: () => void
  /** A star or note changed: leaving now would lose it */
  markDirty: () => void
  isDirty: () => boolean
  /** For links: true = swallow this tap (the first one), false = let it navigate */
  shouldBlockTap: () => boolean
  hint: boolean
}

// Without a provider (guest overview, results) nothing is ever unsaved
const inert: Guard = { warn: () => {}, markDirty: () => {}, isDirty: () => false, shouldBlockTap: () => false, hint: false }
const GuardContext = createContext<Guard>(inert)

/**
 * One "unsaved stars" state for everything that leaves the wine page: the swipe, the ring strip,
 * the wine list and "‹ Alle Weine". The first attempt shows the hint, the second one goes through.
 * Mount it with key={wine position}, so every wine starts clean.
 */
export function UnsavedGuardProvider({ children }: { children: ReactNode }) {
  const dirty = useRef(false)
  const warned = useRef(false)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    if (!hint) return
    const timer = setTimeout(() => {
      setHint(false)
      warned.current = false
    }, HINT_MS)
    return () => clearTimeout(timer)
  }, [hint])

  const warn = useCallback(() => {
    warned.current = true
    setHint(true)
  }, [])
  const markDirty = useCallback(() => {
    dirty.current = true
    warned.current = false
  }, [])
  const isDirty = useCallback(() => dirty.current, [])
  const shouldBlockTap = useCallback(() => {
    if (!dirty.current || warned.current) return false
    warn()
    return true
  }, [warn])

  const value = useMemo<Guard>(
    () => ({ warn, markDirty, isDirty, shouldBlockTap, hint }),
    [warn, markDirty, isDirty, shouldBlockTap, hint],
  )
  return <GuardContext.Provider value={value}>{children}</GuardContext.Provider>
}

export function useUnsavedGuard(): Guard {
  return useContext(GuardContext)
}

/** Link that asks to save first while the stars are unsaved. Opening in a new tab is always fine. */
export function GuardedLink({ onClick, ...props }: ComponentProps<typeof Link>) {
  const guard = useUnsavedGuard()
  return (
    <Link
      {...props}
      onClick={(e) => {
        onClick?.(e)
        if (e.defaultPrevented) return
        const newTab = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0
        if (!newTab && guard.shouldBlockTap()) e.preventDefault()
      }}
    />
  )
}
