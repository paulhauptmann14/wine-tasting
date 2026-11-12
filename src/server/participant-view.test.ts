import { beforeEach, expect, it } from 'vitest'
import { createTestDb } from '@/test/db'
import { seedTasting, wineInput } from '@/test/factories'
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
  const w1 = await addWine(db, t.id, wineInput('Riesling', { vintage: 2022 }))
  await addWine(db, t.id, wineInput('Silvaner'))
  const { participant } = await joinTasting(db, t.id, 'Anna')
  await saveRating(db, { participantId: participant.id, wineId: w1.id, values: { [gesamt.id]: 4 }, notes: null })

  expect(await getWineListItems(db, t, participant.id)).toEqual([
    { position: 1, title: 'Wein #1', subtitle: null, description: null, state: 'done', href: `/tasting/${t.code}/wine/1` },
    { position: 2, title: 'Wein #2', subtitle: null, description: null, state: 'open', href: `/tasting/${t.code}/wine/2` },
  ])
})

it('shows names in open tastings', async () => {
  const t = await seedTasting(db, { status: 'active', blindTasting: false })
  await addWine(db, t.id, wineInput('Riesling', { winery: 'Dr. Loosen', vintage: 2022, grapeVariety: 'Riesling', description: 'Süß & fruchtig' }))
  const { participant } = await joinTasting(db, t.id, 'Anna')
  const [item] = await getWineListItems(db, t, participant.id)
  expect(item).toMatchObject({ title: 'Riesling', subtitle: 'Dr. Loosen · 2022 · Riesling', description: 'Süß & fruchtig' })
})

it('never exposes the winery of a blind, unfinished tasting to guests', async () => {
  for (const status of ['setup', 'active'] as const) {
    const t = await seedTasting(db, { status, blindTasting: true })
    await addWine(db, t.id, wineInput('Riesling', { winery: 'Geheimes Weingut', wineType: 'white', vintage: 2022 }))
    const { participant } = await joinTasting(db, t.id, 'Anna')
    const items = await getWineListItems(db, t, participant.id)
    expect(JSON.stringify(items)).not.toMatch(/Geheimes|Riesling/)
  }
})

it('shows the winery to guests once a blind tasting is finished', async () => {
  const t = await seedTasting(db, { status: 'finished', blindTasting: true })
  await addWine(db, t.id, wineInput('Riesling', { winery: 'Geheimes Weingut' }))
  const { participant } = await joinTasting(db, t.id, 'Anna')
  expect((await getWineListItems(db, t, participant.id))[0]).toMatchObject({ title: 'Riesling', subtitle: 'Geheimes Weingut' })
})

it('never exposes the description of a blind, unfinished tasting to guests', async () => {
  for (const status of ['setup', 'active'] as const) {
    const t = await seedTasting(db, { status, blindTasting: true })
    await addWine(db, t.id, wineInput('Innamorati', { description: 'Süß & fruchtig', wineType: 'white' }))
    const { participant } = await joinTasting(db, t.id, 'Anna')
    const items = await getWineListItems(db, t, participant.id)
    expect(items[0]).toMatchObject({ title: 'Wein #1', description: null })
    expect(JSON.stringify(items)).not.toMatch(/fruchtig|Innamorati/)
  }
})

it('shows the description to guests once a blind tasting is finished', async () => {
  const t = await seedTasting(db, { status: 'finished', blindTasting: true })
  await addWine(db, t.id, wineInput('Innamorati', { description: 'Süß & fruchtig' }))
  const { participant } = await joinTasting(db, t.id, 'Anna')
  expect((await getWineListItems(db, t, participant.id))[0]).toMatchObject({ title: 'Innamorati', description: 'Süß & fruchtig' })
})
