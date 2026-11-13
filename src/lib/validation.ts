import { z } from 'zod'
import type { ActionState } from '@/lib/action-state'
import { LIMITS } from '@/lib/limits'
import { normalizeCode } from '@/lib/tasting/code'
import { MAX_ALCOHOL, MIN_ALCOHOL, parseAlcoholText } from '@/lib/tasting/alcohol'
import { MAX_VINTAGE, MIN_VINTAGE } from '@/lib/tasting/vintage'
import { PRESET_KEYS } from '@/lib/tasting/presets'
import { STATUS_KEYS } from '@/lib/tasting/rules'
import { SWEETNESS_KEYS } from '@/lib/tasting/sweetness'
import { WINE_TYPE_KEYS } from '@/lib/tasting/wine-type'

export function formValue(fd: FormData, key: string): string {
  const value = fd.get(key)
  return typeof value === 'string' ? value : ''
}

/** Failed parse → field errors for the form, plus the entered values so nothing gets lost. */
export function invalid(error: z.ZodError, values?: Record<string, string>): ActionState {
  return { fieldErrors: z.flattenError(error).fieldErrors, values }
}

const tastingName = z
  .string()
  .trim()
  .min(1, 'Wie soll dein Tasting heißen?')
  .max(LIMITS.tastingName, `Maximal ${LIMITS.tastingName} Zeichen.`)

/** Free text under the tasting name. CRLF counts as one character, like a textarea's maxLength; blank lines squeezed. */
const tastingDescription = z
  .string()
  .transform((v) => v.replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim())
  .pipe(z.string().max(LIMITS.tastingDescription, `Maximal ${LIMITS.tastingDescription} Zeichen.`))
  .transform((v) => (v === '' ? null : v))

export const createTastingSchema = z.object({
  name: tastingName,
  description: tastingDescription,
  blindTasting: z.boolean(),
  preset: z.enum(PRESET_KEYS, { error: 'Bitte wähle ein Bewertungssystem.' }),
  pin: z.string().regex(new RegExp(`^\\d{4,${LIMITS.pin}}$`), `Die PIN besteht aus 4 bis ${LIMITS.pin} Ziffern.`),
})

export const settingsSchema = z.object({
  name: tastingName,
  description: tastingDescription,
})

export const joinSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Bitte gib deinen Namen ein.')
    .max(LIMITS.guestName, `Maximal ${LIMITS.guestName} Zeichen.`),
})

export const adminLoginSchema = z.object({
  code: z
    .string()
    .transform((v) => normalizeCode(v))
    .pipe(z.string({ error: 'Der Code hat 6 Zeichen, z. B. 7KX92P.' })),
  pin: z.string().min(1, 'Bitte gib die PIN ein.'),
})

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Maximal ${max} Zeichen.`)
    .transform((v) => (v === '' ? null : v))

/** Select field with "keine Angabe" (empty value → null). */
const optionalChoice = <const T extends readonly [string, ...string[]]>(keys: T, error: string) =>
  z
    .string()
    .transform((v) => (v === '' ? null : v))
    .pipe(z.enum(keys, { error }).nullable())

const ALCOHOL_ERROR = `Alkohol zwischen ${MIN_ALCOHOL} und ${MAX_ALCOHOL} % vol, z. B. 13,5.`
const VINTAGE_RANGE_ERROR = `Jahrgang zwischen ${MIN_VINTAGE} und ${MAX_VINTAGE}.`

export const wineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Bitte gib einen Namen ein.')
    .max(LIMITS.wineName, `Maximal ${LIMITS.wineName} Zeichen.`),
  winery: optionalText(LIMITS.winery),
  vintage: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : Number(v)))
    .pipe(
      z
        .number({ error: 'Jahrgang als Zahl, z. B. 2022.' })
        .int('Jahrgang als Zahl, z. B. 2022.')
        .min(MIN_VINTAGE, VINTAGE_RANGE_ERROR)
        .max(MAX_VINTAGE, VINTAGE_RANGE_ERROR)
        .nullable(),
    ),
  grapeVariety: optionalText(LIMITS.grapeVariety),
  sweetness: optionalChoice(SWEETNESS_KEYS, 'Bitte wähle eine Geschmacksrichtung aus der Liste.'),
  // Required for new input only: the column stays nullable, wines from before this rule have no type
  wineType: z
    .string()
    .min(1, 'Bitte wähle die Weinart.')
    .pipe(z.enum(WINE_TYPE_KEYS, { error: 'Bitte wähle eine Weinart aus der Liste.' })),
  // Free text such as "Süß & fruchtig" – the sweetness level stays its own field
  description: optionalText(LIMITS.wineDescription),
  alcohol: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : parseAlcoholText(v)))
    .pipe(z.number({ error: ALCOHOL_ERROR }).nullable()),
})
export type WineInput = z.output<typeof wineSchema>

export const criterionNameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Bitte gib einen Namen ein.')
    .max(LIMITS.criterionName, `Maximal ${LIMITS.criterionName} Zeichen.`),
})

/** Bound arguments of server actions come from the client – always validate. */
export const idSchema = z.uuid()
export const directionSchema = z.enum(['up', 'down'])
/** A wine number as shown to the guest ("Wein #n") */
export const positionSchema = z.number().int().min(1)
export type Direction = z.infer<typeof directionSchema>
export const statusSchema = z.enum(STATUS_KEYS)

type RatingCriterionScale = { id: string; name?: string; scaleMin: number; scaleMax: number }
type ParsedRating =
  | { ok: true; values: Record<string, number>; notes: string | null }
  | { ok: false; fieldErrors: Record<string, string[]>; message: string }

/** "Geschmack" / "Geruch und Geschmack" / "Geruch, Farbe und Geschmack" */
function joinNames(names: string[]): string {
  return names.length < 2 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} und ${names[names.length - 1]}`
}

function missingStarsMessage(names: string[]): string {
  // Without names (or with a blank one) the sentence would read oddly – fall back to the generic one
  if (names.length === 0 || names.some((n) => !n.trim())) return 'Bitte vergib für jedes Kriterium Sterne.'
  return `Bei ${joinNames(names)} fehlen noch Sterne.`
}

/** Form fields: `c_<criterionId>` per criterion, `notes` optional. */
export function parseRatingForm(fd: FormData, criteria: RatingCriterionScale[]): ParsedRating {
  const values: Record<string, number> = {}
  const fieldErrors: Record<string, string[]> = {}
  const missing: string[] = []

  for (const c of criteria) {
    const raw = formValue(fd, `c_${c.id}`)
    const value = Number(raw)
    if (raw === '' || !Number.isInteger(value) || value < c.scaleMin || value > c.scaleMax) {
      fieldErrors[`c_${c.id}`] = ['Bitte vergib Sterne.']
      missing.push(c.name ?? '')
    } else {
      values[c.id] = value
    }
  }

  const notes = formValue(fd, 'notes').trim()
  if (notes.length > LIMITS.ratingNotes) fieldErrors.notes = [`Maximal ${LIMITS.ratingNotes} Zeichen.`]

  if (Object.keys(fieldErrors).length > 0) {
    const messages = []
    if (missing.length > 0) messages.push(missingStarsMessage(missing))
    if (fieldErrors.notes) messages.push(`Die Notiz ist zu lang. Maximal ${LIMITS.ratingNotes} Zeichen.`)
    return { ok: false, fieldErrors, message: messages.join(' ') }
  }
  return { ok: true, values, notes: notes === '' ? null : notes }
}
