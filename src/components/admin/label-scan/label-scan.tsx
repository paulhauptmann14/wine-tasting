'use client'

import { Camera } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { marginNote, textLink, textLinkFocus } from '@/components/styles'
import type { LabelSuggestion } from '@/lib/label/types'
import { cn } from '@/lib/utils'

export const SCAN_PRIVACY_NOTE = 'Das Foto bleibt auf deinem Gerät. Erkannte Angaben landen nur in leeren oder noch nicht geprüften Feldern.'
export const SCAN_ERROR = 'Das Etikett ließ sich nicht lesen. Versuch ein anderes Foto oder trag die Angaben selbst ein.'
/** The OCR engine (or its code) did not load – a network problem, not the photo. */
export const SCAN_LOAD_ERROR = 'Die Texterkennung ließ sich nicht laden. Prüf die Verbindung und versuch es noch mal.'

type Phase =
  | { kind: 'idle' }
  | { kind: 'reading'; percent: number }
  | { kind: 'done'; message: string }
  | { kind: 'error'; message: string }

/**
 * "Etikett scannen": opens the system chooser (camera or photo library on phones, file picker on a
 * laptop), reads the label on the device and hands the suggestion to the form. The OCR code is
 * imported only on use. `onResult` applies the suggestion and returns the status line to show.
 */
export function LabelScan({ onResult }: { onResult: (suggestion: LabelSuggestion) => string }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const scanRef = useRef(0)
  const noteId = useId()
  const [phase, setPhase] = useState<Phase>({ kind: 'idle' })
  const reading = phase.kind === 'reading'
  // A scan that finishes later always reaches the form as it is then, not as it was at the start
  const onResultRef = useRef(onResult)
  useEffect(() => {
    onResultRef.current = onResult
  })
  // Unmounted (the form was saved and starts over): a scan still running must not fill the next wine
  useEffect(
    () => () => {
      scanRef.current++
    },
    [],
  )

  async function scan(file: File) {
    const scanId = ++scanRef.current
    const current = () => scanRef.current === scanId
    setPhase({ kind: 'reading', percent: 0 })
    // Stays null when the scan code itself did not load (offline, new deployment): a load failure too
    let scanModule: typeof import('./scan-label') | null = null
    try {
      scanModule = await import('./scan-label')
      const suggestion = await scanModule.scanLabel(file, (p) => {
        const percent = Math.min(100, Math.round(p * 100))
        if (current()) setPhase((prev) => (prev.kind === 'reading' && prev.percent < percent ? { kind: 'reading', percent } : prev))
      })
      if (current()) setPhase({ kind: 'done', message: onResultRef.current(suggestion) })
    } catch (error) {
      console.warn('Label scan failed', error)
      const loadFailed = !scanModule || error instanceof scanModule.OcrLoadError
      if (current()) setPhase({ kind: 'error', message: loadFailed ? SCAN_LOAD_ERROR : SCAN_ERROR })
    }
  }

  return (
    <div className="grid grid-cols-1 gap-1">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        tabIndex={-1}
        aria-hidden
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0]
          // Reset so the same photo can be picked again
          e.target.value = ''
          if (file) void scan(file)
        }}
      />
      <button
        type="button"
        // aria-disabled instead of disabled: the button keeps the focus while the label is read
        aria-disabled={reading || undefined}
        aria-describedby={noteId}
        onClick={() => {
          if (reading) return
          inputRef.current?.click()
        }}
        className={cn(textLink, textLinkFocus, 'gap-2 justify-self-start aria-disabled:cursor-default aria-disabled:opacity-50')}
      >
        <Camera className="size-4" aria-hidden />
        Etikett scannen
      </button>
      <p id={noteId} className={marginNote}>
        {SCAN_PRIVACY_NOTE}
      </p>
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {phase.kind === 'reading' && (
          <span className="text-muted-foreground">
            Etikett wird gelesen … <span className="tabular-nums">{phase.percent} %</span>
          </span>
        )}
        {phase.kind === 'done' && <span className="text-muted-foreground">{phase.message}</span>}
        {phase.kind === 'error' && <span className="text-destructive">{phase.message}</span>}
      </p>
    </div>
  )
}
