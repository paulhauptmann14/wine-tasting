'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { decideSwipe, rubberband, springStep } from '@/lib/gesture'
import { cn } from '@/lib/utils'

const SLOP = 10 // px of movement before a direction is decided
const EDGE = 24 // px – left/right screen edges belong to the system back/forward gesture
const VELOCITY_WINDOW = 100 // ms of pointer history used for the release velocity

type Sample = { t: number; x: number }

/**
 * Swipe between wines on touch screens. The content follows the finger 1:1, the release velocity
 * decides (projected endpoint) and hands over to a spring – so it can be grabbed again mid-flight.
 * Only the content moves (CSS var --swipe-x, see globals.css); the fixed bottom bar stays put.
 * Unsaved stars block the swipe, so nothing gets lost.
 */
export function WineSwipe({
  prevHref,
  nextHref,
  className,
  children,
}: {
  prevHref?: string
  nextHref?: string
  className?: string
  children: ReactNode
}) {
  const router = useRouter()
  const root = useRef<HTMLDivElement>(null)
  const x = useRef(0)
  const frame = useRef(0)
  const dirty = useRef(false)
  const gesture = useRef<{ id: number; startX: number; startY: number; from: number; active: boolean; samples: Sample[] } | null>(null)
  const [hint, setHint] = useState(false)

  useEffect(() => {
    if (prevHref) router.prefetch(prevHref)
    if (nextHref) router.prefetch(nextHref)
  }, [router, prevHref, nextHref])

  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  useEffect(() => {
    if (!hint) return
    const timer = setTimeout(() => setHint(false), 3500)
    return () => clearTimeout(timer)
  }, [hint])

  const width = () => root.current?.offsetWidth ?? window.innerWidth

  function apply(value: number) {
    x.current = value
    const el = root.current
    if (!el) return
    el.style.setProperty('--swipe-x', `${value}px`)
    el.style.setProperty('--swipe-o', String(1 - Math.min(1, Math.abs(value) / el.offsetWidth) * 0.6))
  }

  function animateTo(target: number, velocity: number, onDone?: () => void) {
    cancelAnimationFrame(frame.current)
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) {
      apply(target)
      onDone?.()
      return
    }
    let state = { x: x.current, v: velocity }
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30)
      last = now
      state = springStep(state, target, dt, { response: 0.3 })
      if (Math.abs(state.x - target) < 0.5 && Math.abs(state.v) < 20) {
        apply(target)
        onDone?.()
        return
      }
      apply(state.x)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
  }

  function onPointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse' || !e.isPrimary) return
    if ((e.target as Element).closest('textarea, input, select')) return
    if (e.clientX < EDGE || e.clientX > window.innerWidth - EDGE) return
    // Grab from wherever the content currently is – a running spring stops right there
    cancelAnimationFrame(frame.current)
    gesture.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      from: x.current,
      active: false,
      samples: [{ t: e.timeStamp, x: e.clientX }],
    }
  }

  function onPointerMove(e: React.PointerEvent) {
    const g = gesture.current
    if (!g || e.pointerId !== g.id) return
    const dx = e.clientX - g.startX
    const dy = e.clientY - g.startY
    if (!g.active) {
      if (Math.abs(dy) > SLOP && Math.abs(dy) >= Math.abs(dx)) {
        gesture.current = null // vertical: leave it to scrolling
        return
      }
      if (Math.abs(dx) <= SLOP) return
      g.active = true
      try {
        root.current?.setPointerCapture(e.pointerId)
      } catch {
        // pointer already gone – tracking still works while it lasts
      }
    }
    g.samples.push({ t: e.timeStamp, x: e.clientX })
    g.samples = g.samples.filter((s) => e.timeStamp - s.t <= VELOCITY_WINDOW)

    const raw = g.from + dx - Math.sign(dx) * SLOP
    const blocked = dirty.current || (raw > 0 && !prevHref) || (raw < 0 && !nextHref)
    apply(blocked ? rubberband(raw, width()) : raw)
  }

  function onPointerEnd(e: React.PointerEvent) {
    const g = gesture.current
    if (!g || e.pointerId !== g.id) return
    gesture.current = null
    if (!g.active) return

    // The drag must not also count as a tap on a star (a click would follow right after pointerup)
    const swallow = (ev: Event) => {
      ev.stopPropagation()
      ev.preventDefault()
    }
    window.addEventListener('click', swallow, { capture: true, once: true })
    setTimeout(() => window.removeEventListener('click', swallow, true), 0)

    const first = g.samples[0]
    const lastSample = g.samples[g.samples.length - 1]
    const span = lastSample.t - first.t
    const velocity = span > 0 ? ((lastSample.x - first.x) / span) * 1000 : 0

    if (dirty.current) {
      if (Math.abs(x.current) > SLOP) setHint(true)
      animateTo(0, velocity)
      return
    }
    const w = width()
    const decision = decideSwipe({ offset: x.current, velocity, width: w, hasPrev: !!prevHref, hasNext: !!nextHref })
    if (!decision) {
      animateTo(0, velocity)
      return
    }
    const href = decision === 'next' ? nextHref! : prevHref!
    router.push(href)
    animateTo(decision === 'next' ? -w : w, velocity)
  }

  return (
    <div
      ref={root}
      className={cn('wine-swipe relative touch-pan-y', className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      // Any star or note marks the form as unsaved
      onClickCapture={(e) => {
        if ((e.target as Element).closest('[role="radio"]')) dirty.current = true
      }}
      onInput={() => {
        dirty.current = true
      }}
    >
      {/* Floats above the wine instead of pushing the content down while it shows */}
      <p
        aria-live="polite"
        className={
          hint
            ? 'material-sheet pointer-events-none absolute inset-x-0 top-2 z-10 rounded-xl border-l-2 border-wine px-4 py-3 text-sm animate-in fade-in-0 duration-200'
            : 'sr-only'
        }
      >
        {hint ? 'Speichere erst – sonst gehen deine Sterne verloren.' : ''}
      </p>
      {children}
    </div>
  )
}
