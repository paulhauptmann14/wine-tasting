/**
 * Width and gutter of the page frame – the single source for the page containers
 * (PageShell, FormPage, TastingSplit, LegalPage, home → page; admin layout → admin; TableView → table)
 * and for the site header and footer, so logo, content and footer links share one left edge.
 */
export type SiteFrame = 'page' | 'admin' | 'table'

export const SITE_FRAME_CLASSES: Record<SiteFrame, string> = {
  page: 'max-w-[480px] px-4 sm:max-w-[720px] sm:px-6 lg:max-w-[1100px]',
  admin: 'max-w-[1100px] px-4 sm:px-6',
  table: 'max-w-[1400px] px-4 sm:px-8 lg:px-12',
}

export function siteFrame(pathname: string): SiteFrame {
  const section = pathname.match(/^\/tasting\/[^/]+\/([^/]+)/)?.[1]
  if (section === 'admin') return 'admin'
  if (section === 'table') return 'table'
  return 'page'
}
