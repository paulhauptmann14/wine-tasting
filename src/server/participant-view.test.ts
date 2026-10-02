import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting } from '@/test/factories'
import type { Db } from '@/db/types'
import { listCriteria } from './criteria'
import { joinTasting } from './participants'
import { getWineListItems } from './participant-view'
import { saveRating } from './ratings'
import { addWine } from './wines'

let db: Db
beforeEach(async () => {
  db = await createTestDb()
})

it('hides names in active blind tastings and reports per-wine state', async () => {
  const t = await seedTasting(db, { preset: 'simple', status: 'active', blindTasting: true })
  const [gesamt] = await listCriteria(db, t.id)
  const w1 = await addWine(db, t.id, { name: 'Riesling', vintage: 2022, grapeVariety: null, sweetness: null, wineType: null })
  await addWine(db, t.id, { name: 'Silvaner', vintage: null, grapeVariety: null, sweetness: null, wineType: null })
  const { participant } = await joinTasting(db, t.id, 'Anna')
  await saveRating(db, { participantId: participant.id, wineId: w1.id, values: { [gesamt.id]: 4 }, notes: null })

  expect(await getWineListItems(db, t, participant.id)).toEqual([
    { position: 1, title: 'Wein #1', subtitle: null, state: 'done', href: `/tasting/${t.code}/wine/1` },
    { position: 2, title: 'Wein #2', subtitle: null, state: 'open', href: `/tasting/${t.code}/wine/2` },
  ])
})

it('shows names in open tastings', async () => {
  const t = await seedTasting(db, { status: 'active', blindTasting: false })
  await addWine(db, t.id, { name: 'Riesling', vintage: 2022, grapeVariety: 'Riesling', sweetness: null, wineType: null })
  const { participant } = await joinTasting(db, t.id, 'Anna')
  const [item] = await getWineListItems(db, t, participant.id)
  expect(item).toMatchObject({ title: 'Riesling', subtitle: '2022 · Riesling' })
})
