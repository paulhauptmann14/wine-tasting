import { describe, expect, it } from 'vitest'
import { countUnfinished, duplicateNameHint, findDuplicateNames, unfinishedGuestsText } from './host-hints'

describe('countUnfinished', () => {
  it('counts guests who have not rated every wine completely', () => {
    const people = [
      { doneCount: 3, wines: ['done', 'done', 'done'] },
      { doneCount: 1, wines: ['done', 'incomplete', 'open'] },
      { doneCount: 0, wines: ['open', 'open', 'open'] },
    ]
    expect(countUnfinished(people)).toBe(2)
  })

  it('is zero without guests', () => {
    expect(countUnfinished([])).toBe(0)
  })
})

describe('unfinishedGuestsText', () => {
  it('stays empty when everyone is done', () => {
    expect(unfinishedGuestsText(0)).toBe('')
  })

  it('uses the singular for one guest', () => {
    expect(unfinishedGuestsText(1)).toBe('1 Gast ist noch nicht fertig.')
  })

  it('uses the plural for several guests', () => {
    expect(unfinishedGuestsText(2)).toBe('2 Gäste sind noch nicht fertig.')
  })
})

describe('findDuplicateNames', () => {
  it('finds names that occur more than once, ignoring case and spaces', () => {
    const dupes = findDuplicateNames(['Anna', 'Ben', ' anna ', 'Clara', 'ANNA', 'Ben'])
    expect(dupes.get('anna')).toEqual({ name: 'Anna', count: 3 })
    expect(dupes.get('ben')).toEqual({ name: 'Ben', count: 2 })
    expect(dupes.has('clara')).toBe(false)
  })

  it('is empty without duplicates', () => {
    expect(findDuplicateNames(['Anna', 'Ben']).size).toBe(0)
  })
})

describe('duplicateNameHint', () => {
  it('names the duplicate and the way out', () => {
    expect(duplicateNameHint({ name: 'Anna', count: 2 })).toBe(
      'Zweimal Anna? Vermutlich ein neues Handy – entfern den Eintrag ohne Bewertungen.',
    )
  })

  it('counts higher repetitions', () => {
    expect(duplicateNameHint({ name: 'Ben', count: 3 })).toMatch(/^Dreimal Ben\?/)
    expect(duplicateNameHint({ name: 'Ben', count: 5 })).toMatch(/^5-mal Ben\?/)
  })
})
