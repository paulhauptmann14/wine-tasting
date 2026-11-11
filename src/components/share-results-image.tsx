'use client'

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Download, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'

const FALLBACK_NAME = 'wine-tasting-ergebnis.png'
const ERROR_TEXT = 'Das Bild ging nicht. Versuch es noch einmal.'

const textLink =
  'inline-flex h-12 shrink-0 items-center justify-center font-medium underline decoration-border decoration-2 underline-offset-[6px] outline-none transition-opacity duration-100 hover:decoration-wine active:opacity-50 focus-visible:decoration-wine lg:justify-start lg:px-4'

/** Reads the file name from Content-Disposition (RFC 6266), falling back to a neutral name. */
function fileNameFrom(header: string | null): string {
  if (!header) return FALLBACK_NAME
  const encoded = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim())
    } catch {
      // Malformed encoding – try the plain parameter below
    }
  }
  return header.match(/filename="?([^";]+)"?/i)?.[1].trim() || FALLBACK_NAME
}

async function loadFile(url: string): Promise<File> {
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Image request failed with ${res.status}`)
  const blob = await res.blob()
  return new File([blob], fileNameFrom(res.headers.get('content-disposition')), { type: 'image/png' })
}

function isAbort(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError'
}

function download(file: File) {
  const url = URL.createObjectURL(file)
  const link = document.createElement('a')
  link.href = url
  link.download = file.name
  link.hidden = true
  document.body.append(link)
  link.click()
  link.remove()
  // Give the browser a moment to start the download before the URL goes away
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

/** Phones can hand a PNG to the share sheet; most laptop browsers can't. */
function canShareFiles() {
  return Boolean(navigator.canShare?.({ files: [new File([], 'x.png', { type: 'image/png' })] }))
}
const subscribeNever = () => () => {}

/**
 * Main action on the finished results page: shares the ranking as a PNG via the share sheet
 * (phones), otherwise downloads it (laptops). "Bild öffnen" is the plain path to just look at it.
 */
export function ShareResultsImage({ code, title }: { code: string; title: string }) {
  const imageUrl = `/tasting/${code}/results/image`
  const share = useSyncExternalStore(subscribeNever, canShareFiles, () => true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  // Loaded before the tap: share() needs a fresh tap, and rendering the image on demand
  // (slow on a Raspberry Pi) would use it up – Safari then refuses the share sheet.
  const fileRef = useRef<Promise<File> | null>(null)

  const prepare = useCallback(() => {
    const file = loadFile(imageUrl)
    // A failed preload is retried on the tap
    file.catch(() => {
      if (fileRef.current === file) fileRef.current = null
    })
    fileRef.current = file
  }, [imageUrl])

  useEffect(() => {
    prepare()
    // Wines can still be edited after the end – take a fresh image whenever the page comes back
    const onVisible = () => {
      if (document.visibilityState === 'visible') prepare()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [prepare])

  async function handleClick() {
    if (pending) return
    if (!fileRef.current) prepare()
    setPending(true)
    setError(false)
    try {
      const file = await fileRef.current!
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title })
          return
        } catch (shareError) {
          if (isAbort(shareError)) return
          // e.g. NotAllowedError when the tap is too long ago – the download still gets the image out
        }
      }
      download(file)
    } catch {
      setError(true)
    } finally {
      setPending(false)
      // The next tap shares the current state, not this one
      prepare()
    }
  }

  return (
    <div className="flex flex-col lg:flex-row lg:items-center">
      {/* Always rendered, so screen readers announce the error when it appears */}
      <p aria-live="polite" className="text-sm lg:order-last lg:ml-4">
        {error && <span className="mb-2 block border-l-2 border-wine pl-3 lg:mb-0">{ERROR_TEXT}</span>}
      </p>
      {/* One row on phones, so the bar stays low enough not to cover the footer links */}
      <div className="flex items-center gap-4 lg:gap-0">
        <Button
          type="button"
          size="lg"
          className="h-14 min-w-0 flex-1 gap-2 text-base aria-disabled:opacity-50 lg:flex-none lg:px-8"
          // Not `disabled`: that would drop the keyboard focus while the image loads
          aria-disabled={pending}
          onClick={handleClick}
        >
          {share ? <Share className="size-5" aria-hidden /> : <Download className="size-5" aria-hidden />}
          {pending ? 'Bild wird erstellt …' : share ? 'Ergebnis als Bild teilen' : 'Bild herunterladen'}
        </Button>
        <a href={imageUrl} target="_blank" rel="noopener" className={textLink}>
          Bild öffnen
        </a>
      </div>
    </div>
  )
}
