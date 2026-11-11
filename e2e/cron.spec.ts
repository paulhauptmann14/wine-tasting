import { expect, test } from '@playwright/test'
import { E2E_CRON_SECRET } from './constants'

// The route only talks to the server – one device is enough
test('cleanup route runs only with the cron secret', async ({ request }, testInfo) => {
  test.skip(testInfo.project.name !== 'laptop')

  expect((await request.get('/api/cron/purge')).status()).toBe(401)
  expect((await request.get('/api/cron/purge', { headers: { authorization: 'Bearer wrong' } })).status()).toBe(401)

  const ok = await request.get('/api/cron/purge', { headers: { authorization: `Bearer ${E2E_CRON_SECRET}` } })
  expect(ok.status()).toBe(200)
  expect(await ok.json()).toEqual({ deleted: { tastings: expect.any(Number), sessions: expect.any(Number) } })
})
