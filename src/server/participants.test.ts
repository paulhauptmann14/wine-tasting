import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import type { Db } from '@/db/types'
import { ratings, sessions, wines } from '@/db/schema'
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

it('lists participants in join order with rating counts', async () => {
  const t = await seedTasting(db)
  const [wine] = await db.insert(wines).values({ tastingId: t.id, position: 1, name: 'R' }).returning()
  const anna = await joinTasting(db, t.id, 'Anna', now)
  await joinTasting(db, t.id, 'Ben', new Date(now.getTime() + 1000))
  await db.insert(ratings).values({ participantId: anna.participant.id, wineId: wine.id })
  const list = await listParticipants(db, t.id)
  expect(list.map((p) => [p.name, p.ratingCount])).toEqual([['Anna', 1], ['Ben', 0]])
})
