'use client'

import { useState, useSyncExternalStore } from 'react'
import { flushSync } from 'react-dom'
import { Moon, Sun } from 'lucide-react'
import { THEME_COLORS, THEME_COOKIE, type Theme } from '@/lib/theme'

const DARK_QUERY = '(prefers-color-scheme: dark)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(DARK_QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

export function ThemeToggle({ initial }: { initial?: Theme }) {
  const [saved, setSaved] = useState<Theme | undefined>(initial)
  const systemDark = useSyncExternalStore(
    subscribe,
    () => window.matchMedia(DARK_QUERY).matches,
    () => false,
  )
  const current: Theme = saved ?? (systemDark ? 'dark' : 'light')
  const next: Theme = current === 'dark' ? 'light' : 'dark'

  function apply() {
    document.documentElement.dataset.theme = next
    // Browser bars (Safari's toolbar, Android's status bar) follow along
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
      meta.removeAttribute('media')
      meta.setAttribute('content', THEME_COLORS[next])
    })
    document.querySelector('meta[name="color-scheme"]')?.setAttribute('content', next)
    document.cookie = `${THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    // Synchronous, so the icon is part of the cross-fade's "after" snapshot
    flushSync(() => setSaved(next))
  }

  function toggle() {
    // Cross-fade between light and dark where supported; instant with reduced motion
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (!document.startViewTransition || reduced) apply()
    // A skipped transition (double tap, hidden tab) still applies the theme – only the fade is dropped
    else document.startViewTransition(apply).ready.catch(() => {})
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={next === 'dark' ? 'Dunkles Design' : 'Helles Design'}
      className="grid size-12 place-items-center rounded-full text-muted-foreground outline-none transition-[color,background-color,transform] duration-100 active:scale-90 hover:bg-card hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
    >
      {next === 'dark' ? <Moon className="size-5" aria-hidden /> : <Sun className="size-5" aria-hidden />}
    </button>
  )
}
