import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import type { Db } from '@/db/types'
import { listCriteria } from './criteria'
import { joinTasting } from './participants'
import { saveRating } from './ratings'
import { listWineNotes } from './results-data'
import { addWine } from './wines'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

const wineInput = (name: string) => ({ name, vintage: null, grapeVariety: null, sweetness: null, wineType: null })

it('groups notes per wine without any reference to the author', async () => {
  const t = await seedTasting(db, { preset: 'simple', status: 'active' })
  const [gesamt] = await listCriteria(db, t.id)
  const riesling = await addWine(db, t.id, wineInput('Riesling'))
  const silvaner = await addWine(db, t.id, wineInput('Silvaner'))
  const anna = (await joinTasting(db, t.id, 'Anna')).participant
  const ben = (await joinTasting(db, t.id, 'Ben')).participant
  const rate = (participantId: string, wineId: string, notes: string | null) =>
    saveRating(db, { participantId, wineId, values: { [gesamt.id]: 4 }, notes })

  await rate(anna.id, riesling.id, 'Pfirsich, sehr frisch')
  await rate(ben.id, riesling.id, 'Zu sauer')
  await rate(anna.id, silvaner.id, null)

  const notes = await listWineNotes(db, t.id)
  expect(Object.keys(notes)).toEqual([riesling.id])
  expect([...notes[riesling.id]].sort()).toEqual(['Pfirsich, sehr frisch', 'Zu sauer'])
  expect(JSON.stringify(notes)).not.toMatch(/Anna|Ben|participant/)
})

it('ignores notes from other tastings', async () => {
  const t = await seedTasting(db, { preset: 'simple', status: 'active' })
  const other = await seedTasting(db, { preset: 'simple', status: 'active' })
  const [gesamt] = await listCriteria(db, other.id)
  const wine = await addWine(db, other.id, wineInput('Riesling'))
  const { participant } = await joinTasting(db, other.id, 'Anna')
  await saveRating(db, { participantId: participant.id, wineId: wine.id, values: { [gesamt.id]: 4 }, notes: 'fremd' })

  expect(await listWineNotes(db, t.id)).toEqual({})
})
