import { and, asc, count, eq, gt } from 'drizzle-orm'
import type { Db } from '@/db/types'
import { participants, ratings, sessions } from '@/db/schema'
import { generateSessionToken, hashToken } from '@/lib/auth/tokens'

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

export async function listParticipants(db: Db, tastingId: string) {
  return db
    .select({
      id: participants.id,
      name: participants.name,
      createdAt: participants.createdAt,
      ratingCount: count(ratings.id),
    })
    .from(participants)
    .leftJoin(ratings, eq(ratings.participantId, participants.id))
    .where(eq(participants.tastingId, tastingId))
    .groupBy(participants.id)
    .orderBy(asc(participants.createdAt))
}
