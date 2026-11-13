'use client'

import { useId, useState, useSyncExternalStore, type ReactNode } from 'react'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { CopyLinkButton } from '@/components/admin/copy-link-button'
import { marginNote, textLink, textLinkFocus } from '@/components/styles'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type RejoinLinkProps = {
  /** Guest's display name */
  name: string
  tastingName: string
  url: string
  /** Bound server action that locks this guest's current link */
  lockAction: (formData: FormData) => void | Promise<void>
  /** The rest of the row (delete button, progress rings): rendered between toggle and panel, so focus and reading order match what is shown */
  children?: ReactNode
}

const canShare = () => typeof navigator.share === 'function'
const subscribeNever = () => () => {}

/**
 * "Rückkehr-Link" toggle, then `children`, then the panel – as flex items: the parent row must be
 * `flex flex-wrap`, the panel takes a line of its own below everything else (`basis-full`).
 */
export function RejoinLink({ name, tastingName, url, lockAction, children }: RejoinLinkProps) {
  const panelId = useId()
  const [open, setOpen] = useState(false)
  const share = useSyncExternalStore(subscribeNever, canShare, () => false)
  // After "Link sperren" the page revalidates and hands in a new url – say so
  const [shownUrl, setShownUrl] = useState(url)
  const [renewed, setRenewed] = useState(false)
  if (url !== shownUrl) {
    setShownUrl(url)
    setRenewed(true)
  }

  const toggle = () => {
    setOpen(!open)
    setRenewed(false)
  }

  const shareLink = async () => {
    try {
      await navigator.share({ title: 'Wine Tasting', text: `Dein Link zurück zu „${tastingName}“`, url })
    } catch {
      // AbortError = share sheet closed, no error; on any other failure "Link kopieren" is right next to it
    }
  }

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        aria-label={`Rückkehr-Link für ${name}`}
        className={cn(textLink, textLinkFocus, 'shrink-0 text-sm')}
      >
        Rückkehr-Link
      </button>
      {children}
      <div id={panelId} hidden={!open} className="basis-full space-y-3 pt-1 pb-3">
        <p className={marginNote}>
          Schick {name} diesen Link. Damit macht {name} auf jedem Gerät mit den eigenen Bewertungen weiter – bis zum
          Ende des Tastings.
        </p>
        <p className="text-sm break-all select-all">{url}</p>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {share && (
            <Button type="button" variant="secondary" size="lg" className="h-12" onClick={shareLink}>
              Teilen
            </Button>
          )}
          <CopyLinkButton url={url} />
          <ConfirmSubmit
            action={lockAction}
            trigger="Link sperren"
            triggerClassName={cn(textLink, textLinkFocus, 'text-sm')}
            title={`Link für ${name} sperren?`}
            description={`Der bisherige Link funktioniert dann nicht mehr. ${name} bleibt auf den Geräten angemeldet, auf denen er schon benutzt wurde. Danach gibt es einen neuen Link.`}
            confirmLabel="Sperren"
          />
          <span aria-live="polite" className="text-sm text-muted-foreground">
            {renewed ? 'Neuer Link erstellt.' : ''}
          </span>
        </div>
      </div>
    </>
  )
}
