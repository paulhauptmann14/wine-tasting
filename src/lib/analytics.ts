/** Ersetzt den Tasting-Code in Analytics-URLs – er ist der Zugang zum Tasting und gehört nicht in fremde Statistiken. */
export function redactTastingCode(href: string): string {
  const url = new URL(href)
  url.pathname = url.pathname.replace(/^\/tasting\/[^/]+/, '/tasting/[code]')
  if (url.searchParams.has('code')) url.searchParams.set('code', '[code]')
  return url.toString()
}
