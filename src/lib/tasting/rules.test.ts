import { describe, expect, it } from 'vitest'
import { canEditStructure, canJoin, canRate, canSeeNotes, canSeeResults, canSeeWineNames, canTransition } from './rules'

describe('participant permissions', () => {
  it('lets guests join until the tasting is finished', () => {
    expect(canJoin('setup')).toBe(true)
    expect(canJoin('active')).toBe(true)
    expect(canJoin('finished')).toBe(false)
  })
  it('only allows rating while active', () => {
    expect(canRate('setup')).toBe(false)
    expect(canRate('active')).toBe(true)
    expect(canRate('finished')).toBe(false)
  })
  it('shows results to guests once started, to admins always', () => {
    expect(canSeeResults('setup', false)).toBe(false)
    expect(canSeeResults('active', false)).toBe(true)
    expect(canSeeResults('finished', false)).toBe(true)
    expect(canSeeResults('setup', true)).toBe(true)
  })
})

describe('canSeeNotes', () => {
  it('shows notes to everyone only after the tasting is finished', () => {
    expect(canSeeNotes('setup')).toBe(false)
    expect(canSeeNotes('active')).toBe(false)
    expect(canSeeNotes('finished')).toBe(true)
  })
})

describe('canSeeWineNames', () => {
  it('hides names in blind tastings until finished', () => {
    expect(canSeeWineNames({ status: 'active', blindTasting: true, isAdmin: false })).toBe(false)
    expect(canSeeWineNames({ status: 'finished', blindTasting: true, isAdmin: false })).toBe(true)
  })
  it('always shows names in open tastings and to admins', () => {
    expect(canSeeWineNames({ status: 'active', blindTasting: false, isAdmin: false })).toBe(true)
    expect(canSeeWineNames({ status: 'active', blindTasting: true, isAdmin: true })).toBe(true)
  })
})

describe('canTransition', () => {
  const ready = { wineCount: 2, criteriaCount: 4 }
  it('allows the forward and backward steps', () => {
    expect(canTransition('setup', 'active', ready)).toEqual({ ok: true })
    expect(canTransition('active', 'finished', ready)).toEqual({ ok: true })
    expect(canTransition('active', 'setup', ready)).toEqual({ ok: true })
    expect(canTransition('finished', 'active', ready)).toEqual({ ok: true })
  })
  it('rejects skipping steps', () => {
    expect(canTransition('setup', 'finished', ready).ok).toBe(false)
    expect(canTransition('finished', 'setup', ready).ok).toBe(false)
  })
  it('requires wines and criteria to start', () => {
    expect(canTransition('setup', 'active', { wineCount: 0, criteriaCount: 4 })).toEqual({
      ok: false, reason: 'Füg zuerst mindestens einen Wein hinzu.',
    })
    expect(canTransition('setup', 'active', { wineCount: 1, criteriaCount: 0 })).toEqual({
      ok: false, reason: 'Leg zuerst mindestens ein Bewertungskriterium an.',
    })
  })
})

describe('canEditStructure', () => {
  it('allows reordering, deleting and criteria changes only during setup', () => {
    expect(canEditStructure('setup')).toBe(true)
    expect(canEditStructure('active')).toBe(false)
    expect(canEditStructure('finished')).toBe(false)
  })
})
