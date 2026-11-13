import { beforeEach, describe, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import type { Db } from '@/db/types'
import { ratingCriteria, ratingValues, ratings, sessions, wines } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { signRejoinToken } from '@/lib/auth/rejoin-token'
import {
  countParticipants,
  findRejoinParticipant,
  getParticipantBySessionToken,
  joinTasting,
  listParticipantProgress,
  lockRejoinLink,
  rejoinTasting,
  removeParticipant,
} from './participants'

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

it('removes a participant with sessions and ratings, only within its tasting', async () => {
  const t = await seedTasting(db, { preset: 'simple' })
  const other = await seedTasting(db)
  const [wine] = await db.insert(wines).values({ tastingId: t.id, position: 1, name: 'R' }).returning()
  const anna = await joinTasting(db, t.id, 'Anna', now)
  await db.insert(ratings).values({ participantId: anna.participant.id, wineId: wine.id })

  expect(await removeParticipant(db, other.id, anna.participant.id)).toBe(false)
  expect(await removeParticipant(db, t.id, anna.participant.id)).toBe(true)

  expect(await countParticipants(db, t.id)).toBe(0)
  expect(await db.select().from(ratings)).toEqual([])
  expect(await getParticipantBySessionToken(db, t.id, anna.token, now)).toBeNull()
})

it('reports per-wine progress for every participant', async () => {
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
  const [done] = await db.insert(ratings).values({ participantId: anna.participant.id, wineId: w1.id }).returning()
  await db.insert(ratingValues).values({ ratingId: done.id, criterionId: gesamt.id, value: 5 })
  await db.insert(ratings).values({ participantId: anna.participant.id, wineId: w2.id })

  const progress = await listParticipantProgress(db, t.id)
  expect(progress.map((p) => [p.name, p.wines, p.doneCount])).toEqual([
    ['Anna', ['done', 'incomplete'], 1],
    ['Ben', ['open', 'open'], 0],
  ])
})

it('counts the guests of one tasting only', async () => {
  const t = await seedTasting(db, { preset: 'simple' })
  const other = await seedTasting(db, { preset: 'simple' })
  expect(await countParticipants(db, t.id)).toBe(0)
  await joinTasting(db, t.id, 'Anna')
  await joinTasting(db, t.id, 'Ben')
  await joinTasting(db, other.id, 'Clara')
  expect(await countParticipants(db, t.id)).toBe(2)
})

describe('rejoin link', () => {
  const secret = 'test-secret-that-is-long-enough-1234567890'

  it('signs a guest back in on another device; the old device stays signed in', async () => {
    const t = await seedTasting(db)
    const { participant, token: oldSession } = await joinTasting(db, t.id, 'Anna', now)
    const [person] = await listParticipantProgress(db, t.id)
    expect(person.rejoinVersion).toBe(0)
    const link = signRejoinToken(participant.id, person.rejoinVersion, secret)

    expect(await findRejoinParticipant(db, t.id, link, secret)).toEqual({ id: participant.id, name: 'Anna' })
    const rejoined = await rejoinTasting(db, t.id, link, secret, now)
    expect(rejoined?.participant).toEqual({ id: participant.id, name: 'Anna' })
    expect(rejoined?.expiresAt.toISOString()).toBe('2026-10-31T20:00:00.000Z')
    expect(await getParticipantBySessionToken(db, t.id, rejoined!.token, now)).toEqual({ id: participant.id, name: 'Anna' })
    expect(await getParticipantBySessionToken(db, t.id, oldSession, now)).toEqual({ id: participant.id, name: 'Anna' })
    // Reusable: works a second time
    expect(await rejoinTasting(db, t.id, link, secret, now)).not.toBeNull()
  })

  it('refuses links of other tastings, wrong secrets, tampered or malformed links', async () => {
    const t = await seedTasting(db)
    const other = await seedTasting(db)
    const { participant } = await joinTasting(db, t.id, 'Anna', now)
    const link = signRejoinToken(participant.id, 0, secret)
    expect(await findRejoinParticipant(db, other.id, link, secret)).toBeNull()
    expect(await findRejoinParticipant(db, t.id, signRejoinToken(participant.id, 0, `${secret}x`), secret)).toBeNull()
    // Change the first signature character: it always carries signature bits
    const [id, signature] = link.split('.')
    const tampered = `${id}.${signature[0] === 'A' ? 'B' : 'A'}${signature.slice(1)}`
    expect(await findRejoinParticipant(db, t.id, tampered, secret)).toBeNull()
    expect(await findRejoinParticipant(db, t.id, 'nonsense', secret)).toBeNull()
    expect(await rejoinTasting(db, other.id, link, secret, now)).toBeNull()
    expect(await db.$count(sessions)).toBe(1)
  })

  it('locking makes every older link invalid and gives a new one', async () => {
    const t = await seedTasting(db)
    const { participant } = await joinTasting(db, t.id, 'Anna', now)
    const old = signRejoinToken(participant.id, 0, secret)
    expect(await lockRejoinLink(db, t.id, participant.id)).toBe(true)
    expect(await findRejoinParticipant(db, t.id, old, secret)).toBeNull()
    expect(await rejoinTasting(db, t.id, old, secret, now)).toBeNull()
    const [person] = await listParticipantProgress(db, t.id)
    expect(person.rejoinVersion).toBe(1)
    expect(await findRejoinParticipant(db, t.id, signRejoinToken(participant.id, 1, secret), secret)).not.toBeNull()
  })

  it('locks only guests of the own tasting', async () => {
    const t = await seedTasting(db)
    const other = await seedTasting(db)
    const { participant } = await joinTasting(db, t.id, 'Anna', now)
    expect(await lockRejoinLink(db, other.id, participant.id)).toBe(false)
    expect(await findRejoinParticipant(db, t.id, signRejoinToken(participant.id, 0, secret), secret)).not.toBeNull()
  })

  it('dies with the removed guest', async () => {
    const t = await seedTasting(db)
    const { participant } = await joinTasting(db, t.id, 'Anna', now)
    const link = signRejoinToken(participant.id, 0, secret)
    await removeParticipant(db, t.id, participant.id)
    expect(await rejoinTasting(db, t.id, link, secret, now)).toBeNull()
  })
})
