/**
 * Replaces the tasting code and a rejoin token in analytics URLs – both grant access (to the tasting, to a
 * guest's seat) and don't belong in third-party stats.
 */
export function redactTastingCode(href: string): string {
  const url = new URL(href)
  url.pathname = url.pathname
    .replace(/^\/tasting\/[^/]+/, '/tasting/[code]')
    .replace(/^(\/tasting\/\[code\]\/rejoin)\/[^/]+/, '$1/[token]')
  if (url.searchParams.has('code')) url.searchParams.set('code', '[code]')
  return url.toString()
}
