import 'server-only'
import { cache } from 'react'
import { db } from '@/db/client'
import { getTastingByCode } from '@/server/tastings'

/** Einmal pro Request – Layout und Seite teilen sich den Lookup. */
export const getTasting = cache((code: string) => getTastingByCode(db, code))
