import { test as base, type BrowserContext, type Page } from '@playwright/test'

export { expect } from '@playwright/test'

type Fixtures = {
  /** Opens a separate browser context per guest, using the current project's device (phone/tablet/laptop). */
  newGuest: () => Promise<Page>
}

export const test = base.extend<Fixtures>({
  // Playwright only closes the contexts of its own fixtures – guests' pages would keep polling
  // the server (AutoRefresh) until the worker ends
  newGuest: async ({ browser }, provide, testInfo) => {
    const contexts: BrowserContext[] = []
    await provide(async () => {
      const u = testInfo.project.use
      const context = await browser.newContext({
        baseURL: u.baseURL,
        viewport: u.viewport,
        userAgent: u.userAgent,
        deviceScaleFactor: u.deviceScaleFactor,
        isMobile: u.isMobile,
        hasTouch: u.hasTouch,
      })
      contexts.push(context)
      return context.newPage()
    })
    await Promise.all(contexts.map((context) => context.close()))
  },
})
