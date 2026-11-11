import { db } from '@/db/client'
import { isAuthorizedCron } from '@/lib/auth/cron'
import { purgeExpired } from '@/server/tastings'

/**
 * Daily cleanup (vercel.json → crons): deletes tastings past the retention period and expired sessions.
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`; without a configured secret the route stays closed.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get('authorization'), process.env.CRON_SECRET)) {
    return new Response('Unauthorized', { status: 401 })
  }
  const deleted = await purgeExpired(db)
  // Counts only – no codes or names in the logs
  console.info(`purge: ${deleted.tastings} tastings, ${deleted.sessions} sessions deleted`)
  return Response.json({ deleted })
}
