import type { Metadata } from 'next'
import { ParticipantRingShapes, ParticipantRowRest } from '@/components/admin/participant-progress'
import { RejoinLink } from '@/components/admin/rejoin-link'
import { AutoRefresh } from '@/components/auto-refresh'
import { GlassRing } from '@/components/glass-ring'
import { marginNote } from '@/components/styles'
import { db } from '@/db/client'
import { signRejoinToken } from '@/lib/auth/rejoin-token'
import { getJoinUrl } from '@/lib/base-url'
import { getAdminTasting } from '@/lib/data'
import { getSessionSecret } from '@/lib/env'
import { duplicateNameHint, findDuplicateNames, isDuplicateName } from '@/lib/tasting/host-hints'
import type { RingState } from '@/lib/tasting/progress'
import { cn } from '@/lib/utils'
import { listParticipantProgress } from '@/server/participants'
import { lockRejoinLinkAction, removeParticipantAction } from '../actions'

export const metadata: Metadata = { title: 'Teilnehmer · Verwaltung' }

const LEGEND: { state: RingState; text: string }[] = [
  { state: 'done', text: 'bewertet' },
  { state: 'open', text: 'offen' },
  { state: 'incomplete', text: 'Kriterium fehlt' },
]

export default async function ParticipantsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const people = await listParticipantProgress(db, tasting.id)

  if (people.length === 0) {
    return (
      <>
        {tasting.status !== 'finished' && <AutoRefresh />}
        <p className="text-muted-foreground">Noch niemand da. Teile den QR-Code, damit deine Gäste beitreten können.</p>
      </>
    )
  }
  // Same name twice: usually a guest on a new device (the session cookie is per browser)
  const duplicates = findDuplicateNames(people.map((p) => p.name))
  const firstDuplicate = duplicates.values().next().value
  // Rejoin links work until the end – a finished tasting has nothing left to rejoin
  const joinUrl = tasting.status === 'finished' ? null : await getJoinUrl(tasting.code)
  const secret = joinUrl ? getSessionSecret() : null
  return (
    <>
      {tasting.status !== 'finished' && <AutoRefresh />}
      <ParticipantRingShapes count={Math.max(...people.map((p) => p.wines.length))} />
      {firstDuplicate && <p className={cn(marginNote, 'mb-6')}>{duplicateNameHint(firstDuplicate)}</p>}
      <p className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <span>Ein Kreis je Wein:</span>
        {LEGEND.map(({ state, text }, i) => (
          <span key={state} className="inline-flex items-center gap-1.5">
            <GlassRing seed={i + 1} state={state} size={18} />
            {text}
          </span>
        ))}
      </p>
      <ul className="grid grid-cols-1 border-t border-border">
        {people.map((p) => (
          <li key={p.id} className="border-b border-border py-2">
            {/* flex-wrap: the rings and then the rejoin panel each take a line of their own */}
            <div className="flex flex-wrap items-center gap-x-3">
              <span className="flex min-w-0 flex-1 items-baseline gap-2">
                <span className="truncate font-medium">{p.name}</span>
                {isDuplicateName(duplicates, p.name) && (
                  <span className="shrink-0 text-sm text-muted-foreground">doppelt</span>
                )}
              </span>
              <span className="shrink-0 font-mono text-sm text-muted-foreground">
                {p.doneCount} / {p.wines.length}
              </span>
              {/* Without a link (finished tasting) the row is just the rest */}
              {joinUrl && secret ? (
                <RejoinLink
                  name={p.name}
                  tastingName={tasting.name}
                  url={`${joinUrl}/rejoin/${signRejoinToken(p.id, p.rejoinVersion, secret)}`}
                  lockAction={lockRejoinLinkAction.bind(null, tasting.code, p.id)}
                >
                  <RowRest code={tasting.code} person={p} />
                </RejoinLink>
              ) : (
                <RowRest code={tasting.code} person={p} />
              )}
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

/** Delete button and progress rings of a guest's row – drawn on the client, see <ParticipantRowRest>. */
function RowRest({ code, person: p }: { code: string; person: { id: string; name: string; wines: RingState[] } }) {
  return <ParticipantRowRest name={p.name} wines={p.wines} removeAction={removeParticipantAction.bind(null, code, p.id)} />
}
