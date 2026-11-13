const dateFormat = new Intl.DateTimeFormat('de-DE', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'Europe/Berlin',
})

/** "13. November 2026" in German time – the server may run in UTC (Vercel) or without a TZ (Docker). */
export function formatDate(date: Date): string {
  return dateFormat.format(date)
}
