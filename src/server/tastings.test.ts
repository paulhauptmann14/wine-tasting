import { beforeEach, describe, expect, it } from 'vitest'
import { asc, eq } from 'drizzle-orm'
import { createTestDb } from '@/test/db'
import type { Db } from '@/db/types'
import { participants, ratingCriteria, tastings, wines } from '@/db/schema'
import {
  MAX_PIN_ATTEMPTS,
  createTasting,
  deleteTasting,
  getTastingByCode,
  setTastingStatus,
  updateTastingSettings,
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
    expect(criteria.map((c) => [c.name, c.position, c.weight, c.scaleMin, c.scaleMax])).toEqual([
      ['Aussehen', 1, 5, 1, 5], ['Geruch', 2, 15, 1, 5], ['Geschmack', 3, 20, 1, 5], ['Gesamteindruck', 4, 10, 1, 5],
    ])
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

  it('rejects setup → finished', async () => {
    const t = await createTasting(db, input)
    expect((await setTastingStatus(db, t.id, 'finished')).ok).toBe(false)
  })
})

describe('updateTastingSettings', () => {
  it('updates name and blind mode', async () => {
    const t = await createTasting(db, input)
    await updateTastingSettings(db, t.id, { name: 'Neu', blindTasting: false })
    expect(await getTastingByCode(db, t.code)).toMatchObject({ name: 'Neu', blindTasting: false })
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
