import { and, asc, count, eq, gt } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { participants, ratingValues, ratings, sessions, wines } from '@/db/schema'
import { generateSessionToken, hashToken } from '@/lib/auth/tokens'
import { ratingState, type RingState } from '@/lib/tasting/progress'
import { countCriteria } from './criteria'

const SESSION_TTL_DAYS = 30

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

/** Number of guests only – for public views that must not show names (table view). */
export async function countParticipants(db: Db, tastingId: string): Promise<number> {
  return db.$count(participants, eq(participants.tastingId, tastingId))
}

/** Removes a guest including sessions and ratings (cascade). Only within the own tasting. */
export async function removeParticipant(db: Db, tastingId: string, participantId: string): Promise<boolean> {
  const removed = await db
    .delete(participants)
    .where(and(eq(participants.id, participantId), eq(participants.tastingId, tastingId)))
    .returning({ id: participants.id })
  return removed.length > 0
}

/** Progress per guest and wine (by position) – for the host's overview. */
export async function listParticipantProgress(db: Db, tastingId: string) {
  const [people, wineRows, criteriaCount, valueCounts] = await Promise.all([
    db
      .select({ id: participants.id, name: participants.name })
      .from(participants)
      .where(eq(participants.tastingId, tastingId))
      .orderBy(asc(participants.createdAt)),
    db.select({ id: wines.id }).from(wines).where(eq(wines.tastingId, tastingId)).orderBy(asc(wines.position)),
    countCriteria(db, tastingId),
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
    const states: RingState[] = wineRows.map((wine) => ratingState(counts.get(`${person.id}:${wine.id}`), criteriaCount))
    return { ...person, wines: states, doneCount: states.filter((s) => s === 'done').length }
  })
}
