import { beforeEach, describe, expect, it } from 'vitest'
import { asc, eq } from 'drizzle-orm'
import { createTestDb } from '@/test/db'
import { forceStatus } from '@/test/factories'
import type { Db } from '@/db/types'
import { participants, ratingCriteria, sessions, tastings, wines } from '@/db/schema'
import { PRESETS } from '@/lib/tasting/presets'
import { joinTasting } from './participants'
import { StructureLockedError } from './structure'
import {
  MAX_PIN_ATTEMPTS,
  createTasting,
  deleteTasting,
  getTastingByCode,
  purgeExpired,
  setTastingStatus,
  updateTastingDetails,
  setBlindTasting,
  verifyAdminPin,
} from './tastings'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})
const input = { name: 'Weinabend', blindTasting: true, preset: 'hundred' as const, pin: '1234' }

describe('createTasting', () => {
  it('stores the tasting with a hashed pin and the preset criteria', async () => {
    const t = await createTasting(db, input)
    expect(t.code).toMatch(/^[2-9A-HJ-NP-Z]{6}$/)
    expect(t.status).toBe('setup')
    expect(t.blindTasting).toBe(true)
    expect(t.adminPinHash).not.toContain('1234')
    const criteria = await db
      .select()
      .from(ratingCriteria)
      .where(eq(ratingCriteria.tastingId, t.id))
      .orderBy(asc(ratingCriteria.position))
    expect(t.scale).toBe('hundred')
    expect(criteria.map((c) => [c.name, c.position, c.weight, c.scaleMin, c.scaleMax])).toEqual(
      PRESETS.hundred.criteria.map((c, i) => [c.name, i + 1, c.weight, 1, 5]),
    )
  })
})

describe('getTastingByCode', () => {
  it('finds tastings case-insensitively', async () => {
    const t = await createTasting(db, input)
    expect((await getTastingByCode(db, t.code.toLowerCase()))?.id).toBe(t.id)
  })
  it('returns null for invalid or unknown codes', async () => {
    expect(await getTastingByCode(db, 'nope')).toBeNull()
    expect(await getTastingByCode(db, '222222')).toBeNull()
  })
})

describe('verifyAdminPin', () => {
  const now = new Date('2026-10-01T20:00:00Z')
  const minutesLater = (m: number) => new Date(now.getTime() + m * 60_000)

  it('accepts the correct pin', async () => {
    const t = await createTasting(db, input)
    expect(await verifyAdminPin(db, t.code, '1234', now)).toMatchObject({ ok: true, tasting: { id: t.id } })
  })

  it('returns not_found for unknown codes', async () => {
    expect(await verifyAdminPin(db, '222222', '1234', now)).toEqual({ ok: false, reason: 'not_found' })
  })

  it('locks for 10 minutes after 5 wrong attempts', async () => {
    const t = await createTasting(db, input)
    for (let i = 1; i < MAX_PIN_ATTEMPTS; i++) {
      expect(await verifyAdminPin(db, t.code, '0000', now)).toEqual({ ok: false, reason: 'wrong_pin' })
    }
    expect(await verifyAdminPin(db, t.code, '0000', now)).toMatchObject({ ok: false, reason: 'locked' })
    expect(await verifyAdminPin(db, t.code, '1234', minutesLater(5))).toMatchObject({ ok: false, reason: 'locked' })
    expect(await verifyAdminPin(db, t.code, '1234', minutesLater(11))).toMatchObject({ ok: true })
    const [row] = await db.select().from(tastings).where(eq(tastings.id, t.id))
    expect(row.pinFailedAttempts).toBe(0)
    expect(row.pinLockedUntil).toBeNull()
  })

  it('makes every further lockout twice as long until a successful login', async () => {
    const t = await createTasting(db, input)
    const failUntilLocked = async (at: Date) => {
      for (let i = 0; i < MAX_PIN_ATTEMPTS; i++) await verifyAdminPin(db, t.code, '0000', at)
    }
    await failUntilLocked(now) // 1st lock: 10 minutes
    await failUntilLocked(minutesLater(11)) // 2nd lock: 20 minutes
    expect(await verifyAdminPin(db, t.code, '1234', minutesLater(30))).toMatchObject({ ok: false, reason: 'locked' })
    expect(await verifyAdminPin(db, t.code, '1234', minutesLater(32))).toMatchObject({ ok: true })

    const [row] = await db.select().from(tastings).where(eq(tastings.id, t.id))
    expect(row.pinLockCount).toBe(0)
    await failUntilLocked(minutesLater(40)) // after a success it starts at 10 minutes again
    expect(await verifyAdminPin(db, t.code, '1234', minutesLater(51))).toMatchObject({ ok: true })
  })

  it('counts parallel wrong attempts atomically so the lockout cannot be bypassed', async () => {
    const t = await createTasting(db, input)
    const results = await Promise.all(
      Array.from({ length: 10 }, () => verifyAdminPin(db, t.code, '0000', now)),
    )
    const wrong = results.filter((r) => !r.ok && r.reason === 'wrong_pin').length
    expect(wrong).toBeLessThan(MAX_PIN_ATTEMPTS)
    expect(await verifyAdminPin(db, t.code, '1234', minutesLater(1))).toMatchObject({ ok: false, reason: 'locked' })
  })
})

describe('setTastingStatus', () => {
  it('requires a wine before starting', async () => {
    const t = await createTasting(db, input)
    expect(await setTastingStatus(db, t.id, 'active')).toEqual({
      ok: false, reason: 'Füg zuerst mindestens einen Wein hinzu.',
    })
  })

  it('moves through setup → active → finished → active', async () => {
    const t = await createTasting(db, input)
    await db.insert(wines).values({ tastingId: t.id, position: 1, name: 'Riesling' })
    expect(await setTastingStatus(db, t.id, 'active')).toEqual({ ok: true })
    expect(await setTastingStatus(db, t.id, 'finished')).toEqual({ ok: true })
    expect(await setTastingStatus(db, t.id, 'active')).toEqual({ ok: true })
    expect((await getTastingByCode(db, t.code))?.status).toBe('active')
  })
})

describe('updateTastingDetails / setBlindTasting', () => {
  it('changes only its own fields', async () => {
    const t = await createTasting(db, input)
    expect(t.description).toBeNull()
    await updateTastingDetails(db, t.id, { name: 'Neu', description: 'Mosel-Abend' })
    expect(await getTastingByCode(db, t.code)).toMatchObject({
      name: 'Neu',
      description: 'Mosel-Abend',
      blindTasting: t.blindTasting,
    })
    await setBlindTasting(db, t.id, !t.blindTasting)
    expect(await getTastingByCode(db, t.code)).toMatchObject({ name: 'Neu', blindTasting: !t.blindTasting })
    await updateTastingDetails(db, t.id, { name: 'Neu', description: null })
    expect((await getTastingByCode(db, t.code))?.description).toBeNull()
  })

  it('stores the description given when creating', async () => {
    const t = await createTasting(db, { ...input, description: 'Bitte Brot mitbringen.' })
    expect((await getTastingByCode(db, t.code))?.description).toBe('Bitte Brot mitbringen.')
  })

  it('refuses to switch blind mode once the tasting runs – names would be revealed', async () => {
    const t = await createTasting(db, input)
    for (const status of ['active', 'finished'] as const) {
      await forceStatus(db, t.id, status)
      await expect(setBlindTasting(db, t.id, false)).rejects.toBeInstanceOf(StructureLockedError)
    }
    expect((await getTastingByCode(db, t.code))?.blindTasting).toBe(true)
  })
})

describe('deleteTasting', () => {
  it('removes the tasting with everything that belongs to it', async () => {
    const t = await createTasting(db, input)
    const other = await createTasting(db, input)
    await db.insert(wines).values({ tastingId: t.id, position: 1, name: 'Riesling' })
    await db.insert(participants).values({ tastingId: t.id, name: 'Anna' })
    await deleteTasting(db, t.id)
    expect(await getTastingByCode(db, t.code)).toBeNull()
    expect(await db.select().from(wines)).toEqual([])
    expect(await db.select().from(participants)).toEqual([])
    expect(await db.select().from(ratingCriteria).where(eq(ratingCriteria.tastingId, t.id))).toEqual([])
    expect(await getTastingByCode(db, other.code)).not.toBeNull()
  })
})

describe('retention', () => {
  const DAY = 86_400_000
  const backdate = (id: string, days: number) =>
    db.update(tastings).set({ createdAt: new Date(Date.now() - days * DAY) }).where(eq(tastings.id, id))

  it('deletes tastings older than 90 days with everything in them', async () => {
    const old = await createTasting(db, input)
    const fresh = await createTasting(db, input)
    await db.insert(wines).values({ tastingId: old.id, position: 1, name: 'Alt' })
    await joinTasting(db, old.id, 'Anna')
    await backdate(old.id, 91)
    await backdate(fresh.id, 89)

    expect(await purgeExpired(db)).toEqual({ tastings: 1, sessions: 0 })

    expect((await db.select().from(tastings)).map((t) => t.id)).toEqual([fresh.id])
    expect(await db.select().from(wines)).toEqual([])
    expect(await db.select().from(participants)).toEqual([])
  })

  it('removes expired guest sessions', async () => {
    const t = await createTasting(db, input)
    await joinTasting(db, t.id, 'Anna', new Date(Date.now() - 31 * DAY))
    await joinTasting(db, t.id, 'Ben')
    expect(await purgeExpired(db)).toEqual({ tastings: 0, sessions: 1 })
    expect(await db.select().from(sessions)).toHaveLength(1)
  })

  it('treats an expired tasting as gone when looked up by code', async () => {
    const t = await createTasting(db, input)
    await backdate(t.id, 91)
    expect(await getTastingByCode(db, t.code)).toBeNull()
    expect(await db.select().from(tastings)).toEqual([])
  })
})
