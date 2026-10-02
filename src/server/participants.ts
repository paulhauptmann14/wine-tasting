import { and, asc, count, eq, gt, sql } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { participants, ratingCriteria, ratingValues, ratings, sessions, wines } from '@/db/schema'
import { generateSessionToken, hashToken } from '@/lib/auth/tokens'
import type { RingState } from './participant-view'

export const SESSION_TTL_DAYS = 30

export async function joinTasting(db: Db, tastingId: string, name: string, now: Date = new Date()) {
  const token = generateSessionToken()
  const expiresAt = new Date(now.getTime() + SESSION_TTL_DAYS * 86_400_000)
  return db.transaction(async (tx) => {
    const [participant] = await tx
      .insert(participants)
      .values({ tastingId, name, createdAt: now })
      .returning({ id: participants.id, name: participants.name })
    await tx.insert(sessions).values({ participantId: participant.id, tokenHash: hashToken(token), expiresAt })
    return { participant, token, expiresAt }
  })
}

export async function getParticipantBySessionToken(
  db: Db,
  tastingId: string,
  token: string,
  now: Date = new Date(),
): Promise<{ id: string; name: string } | null> {
  const [row] = await db
    .select({ id: participants.id, name: participants.name })
    .from(sessions)
    .innerJoin(participants, eq(sessions.participantId, participants.id))
    .where(
      and(
        eq(sessions.tokenHash, hashToken(token)),
        eq(participants.tastingId, tastingId),
        gt(sessions.expiresAt, now),
      ),
    )
  return row ?? null
}

/** Zählt nur vollständige Bewertungen – wie die Fortschrittsanzeige der Gäste. */
export async function listParticipants(db: Db, tastingId: string) {
  const criteriaCount = await db.$count(ratingCriteria, eq(ratingCriteria.tastingId, tastingId))
  const complete = db
    .select({ ratingId: ratingValues.ratingId })
    .from(ratingValues)
    .groupBy(ratingValues.ratingId)
    .having(sql`count(*) >= ${criteriaCount}`)
    .as('complete')
  return db
    .select({
      id: participants.id,
      name: participants.name,
      createdAt: participants.createdAt,
      ratingCount: count(complete.ratingId),
    })
    .from(participants)
    .leftJoin(ratings, eq(ratings.participantId, participants.id))
    .leftJoin(complete, eq(complete.ratingId, ratings.id))
    .where(eq(participants.tastingId, tastingId))
    .groupBy(participants.id)
    .orderBy(asc(participants.createdAt))
}

/** Entfernt einen Gast samt Sessions und Bewertungen (Cascade). Nur innerhalb des eigenen Tastings. */
export async function removeParticipant(db: Db, tastingId: string, participantId: string): Promise<boolean> {
  const removed = await db
    .delete(participants)
    .where(and(eq(participants.id, participantId), eq(participants.tastingId, tastingId)))
    .returning({ id: participants.id })
  return removed.length > 0
}

/** Fortschritt pro Gast und Wein (nach Position) – für die Übersicht des Gastgebers. */
export async function listParticipantProgress(db: Db, tastingId: string) {
  const [people, wineRows, criteriaCount, valueCounts] = await Promise.all([
    db
      .select({ id: participants.id, name: participants.name, createdAt: participants.createdAt })
      .from(participants)
      .where(eq(participants.tastingId, tastingId))
      .orderBy(asc(participants.createdAt)),
    db.select({ id: wines.id }).from(wines).where(eq(wines.tastingId, tastingId)).orderBy(asc(wines.position)),
    db.$count(ratingCriteria, eq(ratingCriteria.tastingId, tastingId)),
    db
      .select({ participantId: ratings.participantId, wineId: ratings.wineId, valueCount: count(ratingValues.id) })
      .from(ratings)
      .innerJoin(participants, eq(ratings.participantId, participants.id))
      .leftJoin(ratingValues, eq(ratingValues.ratingId, ratings.id))
      .where(eq(participants.tastingId, tastingId))
      .groupBy(ratings.id),
  ])

  const counts = new Map(valueCounts.map((r) => [`${r.participantId}:${r.wineId}`, r.valueCount]))
  return people.map((person) => {
    const states: RingState[] = wineRows.map((wine) => {
      const valueCount = counts.get(`${person.id}:${wine.id}`)
      if (valueCount === undefined) return 'open'
      return valueCount >= criteriaCount ? 'done' : 'incomplete'
    })
    return { ...person, wines: states, doneCount: states.filter((s) => s === 'done').length }
  })
}
