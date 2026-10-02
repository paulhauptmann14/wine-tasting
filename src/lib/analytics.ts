/** Replaces the tasting code in analytics URLs – it grants access to the tasting and doesn't belong in third-party stats. */
export function redactTastingCode(href: string): string {
  const url = new URL(href)
  url.pathname = url.pathname.replace(/^\/tasting\/[^/]+/, '/tasting/[code]')
  if (url.searchParams.has('code')) url.searchParams.set('code', '[code]')
  return url.toString()
}
