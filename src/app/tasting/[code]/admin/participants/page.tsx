import { notFound } from 'next/navigation'
import { db } from '@/db/client'
import { getTasting } from '@/lib/data'
import { listParticipants } from '@/server/participants'
import { listWines } from '@/server/wines'

export default async function ParticipantsPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const tasting = await getTasting(code)
  if (!tasting) notFound()
  const [people, wines] = await Promise.all([listParticipants(db, tasting.id), listWines(db, tasting.id)])

  if (people.length === 0) {
    return (
      <p className="text-muted-foreground">Noch niemand da. Teile den QR-Code, damit deine Gäste beitreten können.</p>
    )
  }
  return (
    <ul className="grid grid-cols-1 gap-2">
      {people.map((p) => (
        <li key={p.id} className="flex items-center justify-between gap-4 rounded-2xl bg-card px-4 py-3">
          <span className="truncate font-medium">{p.name}</span>
          <span className="shrink-0 font-mono text-sm text-muted-foreground">
            {p.ratingCount} / {wines.length} bewertet
          </span>
        </li>
      ))}
    </ul>
  )
}
