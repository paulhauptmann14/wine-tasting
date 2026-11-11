import { z } from 'zod'
import type { ActionState } from '@/lib/action-state'
import { normalizeCode } from '@/lib/tasting/code'
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
  .max(60, 'Maximal 60 Zeichen.')

export const createTastingSchema = z.object({
  name: tastingName,
  blindTasting: z.boolean(),
  preset: z.enum(PRESET_KEYS, { error: 'Bitte wähle ein Bewertungssystem.' }),
  pin: z.string().regex(/^\d{4,12}$/, 'Die PIN besteht aus 4 bis 12 Ziffern.'),
})

export const settingsSchema = z.object({
  name: tastingName,
})

export const joinSchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib deinen Namen ein.').max(40, 'Maximal 40 Zeichen.'),
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

export const wineSchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib einen Namen ein.').max(80, 'Maximal 80 Zeichen.'),
  vintage: z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : Number(v)))
    .pipe(
      z
        .number({ error: 'Jahrgang als Zahl, z. B. 2022.' })
        .int('Jahrgang als Zahl, z. B. 2022.')
        .min(1900, 'Jahrgang zwischen 1900 und 2100.')
        .max(2100, 'Jahrgang zwischen 1900 und 2100.')
        .nullable(),
    ),
  grapeVariety: optionalText(60),
  sweetness: optionalChoice(SWEETNESS_KEYS, 'Bitte wähle eine Geschmacksrichtung aus der Liste.'),
  wineType: optionalChoice(WINE_TYPE_KEYS, 'Bitte wähle eine Weinart aus der Liste.'),
})
export type WineInput = z.output<typeof wineSchema>

export const criterionNameSchema = z.object({
  name: z.string().trim().min(1, 'Bitte gib einen Namen ein.').max(40, 'Maximal 40 Zeichen.'),
})

/** Bound arguments of server actions come from the client – always validate. */
export const idSchema = z.uuid()
export const directionSchema = z.enum(['up', 'down'])
/** A wine number as shown to the guest ("Wein #n") */
export const positionSchema = z.number().int().min(1)
export type Direction = z.infer<typeof directionSchema>
export const statusSchema = z.enum(STATUS_KEYS)

type RatingCriterionScale = { id: string; scaleMin: number; scaleMax: number }
type ParsedRating =
  | { ok: true; values: Record<string, number>; notes: string | null }
  | { ok: false; fieldErrors: Record<string, string[]> }

/** Form fields: `c_<criterionId>` per criterion, `notes` optional. */
export function parseRatingForm(fd: FormData, criteria: RatingCriterionScale[]): ParsedRating {
  const values: Record<string, number> = {}
  const fieldErrors: Record<string, string[]> = {}

  for (const c of criteria) {
    const raw = formValue(fd, `c_${c.id}`)
    const value = Number(raw)
    if (raw === '' || !Number.isInteger(value) || value < c.scaleMin || value > c.scaleMax) {
      fieldErrors[`c_${c.id}`] = ['Bitte vergib Sterne.']
    } else {
      values[c.id] = value
    }
  }

  const notes = formValue(fd, 'notes').trim()
  if (notes.length > 1000) fieldErrors.notes = ['Maximal 1000 Zeichen.']

  if (Object.keys(fieldErrors).length > 0) return { ok: false, fieldErrors }
  return { ok: true, values, notes: notes === '' ? null : notes }
}
