import { db } from '@/db/client'
import { getAdminTasting } from '@/lib/data'
import { listParticipants } from '@/server/participants'
import { listWines } from '@/server/wines'

export default async function ParticipantsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getAdminTasting(code)
  const [people, wines] = await Promise.all([listParticipants(db, tasting.id), listWines(db, tasting.id)])

  if (people.length === 0) {
    return (
      <p className="text-muted-foreground">Noch niemand da. Teile den QR-Code, damit deine Gäste beitreten können.</p>
    )
  }
  return (
    <ul className="grid grid-cols-1 border-t border-border">
      {people.map((p) => (
        <li key={p.id} className="flex min-h-14 items-center justify-between gap-4 border-b border-border py-2">
          <span className="truncate font-medium">{p.name}</span>
          <span className="shrink-0 font-mono text-sm text-muted-foreground">
            {p.ratingCount} / {wines.length} bewertet
          </span>
        </li>
      ))}
    </ul>
  )
}
