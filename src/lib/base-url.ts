import 'server-only'
import { headers } from 'next/headers'

async function getBaseUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '')
  const h = await headers()
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000'
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
  return `${proto}://${host}`
}

/** Public link guests join with – always built from the canonical code. */
export async function getJoinUrl(code: string): Promise<string> {
  return `${await getBaseUrl()}/tasting/${code}`
}
