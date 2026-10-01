import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import type { Db } from '@/db/types'
import { ratingCriteria, ratingValues, ratings, sessions, wines } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { getParticipantBySessionToken, joinTasting, listParticipants } from './participants'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})
const now = new Date('2026-10-01T20:00:00Z')

it('creates a participant with a hashed session token', async () => {
  const t = await seedTasting(db)
  const { participant, token, expiresAt } = await joinTasting(db, t.id, 'Paul', now)
  expect(participant.name).toBe('Paul')
  expect(expiresAt.toISOString()).toBe('2026-10-31T20:00:00.000Z')
  const [session] = await db.select().from(sessions)
  expect(session.tokenHash).not.toBe(token)
  expect(await getParticipantBySessionToken(db, t.id, token, now)).toEqual({ id: participant.id, name: 'Paul' })
})

it('rejects tokens for other tastings, unknown tokens and expired sessions', async () => {
  const t = await seedTasting(db)
  const other = await seedTasting(db)
  const { token } = await joinTasting(db, t.id, 'Paul', now)
  expect(await getParticipantBySessionToken(db, other.id, token, now)).toBeNull()
  expect(await getParticipantBySessionToken(db, t.id, 'unknown', now)).toBeNull()
  expect(await getParticipantBySessionToken(db, t.id, token, new Date('2026-11-01T00:00:00Z'))).toBeNull()
})

it('allows duplicate names as separate participants', async () => {
  const t = await seedTasting(db)
  const a = await joinTasting(db, t.id, 'Max', now)
  const b = await joinTasting(db, t.id, 'Max', now)
  expect(a.participant.id).not.toBe(b.participant.id)
})

it('lists participants in join order counting only complete ratings', async () => {
  const t = await seedTasting(db, { preset: 'simple' })
  const [gesamt] = await db.select().from(ratingCriteria).where(eq(ratingCriteria.tastingId, t.id))
  const [w1, w2] = await db
    .insert(wines)
    .values([
      { tastingId: t.id, position: 1, name: 'R' },
      { tastingId: t.id, position: 2, name: 'S' },
    ])
    .returning()
  const anna = await joinTasting(db, t.id, 'Anna', now)
  await joinTasting(db, t.id, 'Ben', new Date(now.getTime() + 1000))
  const [complete] = await db.insert(ratings).values({ participantId: anna.participant.id, wineId: w1.id }).returning()
  await db.insert(ratingValues).values({ ratingId: complete.id, criterionId: gesamt.id, value: 4 })
  // Bewertung ohne Werte zählt nicht – so wie in der Gäste-Ansicht
  await db.insert(ratings).values({ participantId: anna.participant.id, wineId: w2.id })
  const list = await listParticipants(db, t.id)
  expect(list.map((p) => [p.name, p.ratingCount])).toEqual([['Anna', 1], ['Ben', 0]])
})
