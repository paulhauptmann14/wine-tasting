import {
  boolean,
  index,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'
// Relative imports: drizzle-kit loads this file without the '@/' alias
import { SCALE_KEYS } from '../lib/tasting/presets'
import { STATUS_KEYS } from '../lib/tasting/rules'
import { SWEETNESS_KEYS } from '../lib/tasting/sweetness'
import { WINE_TYPE_KEYS } from '../lib/tasting/wine-type'

const timestamptz = (name: string) => timestamp(name, { withTimezone: true })

export const tastingStatus = pgEnum('tasting_status', STATUS_KEYS)
export const wineSweetness = pgEnum('wine_sweetness', SWEETNESS_KEYS)
export const ratingScale = pgEnum('rating_scale', SCALE_KEYS)
export const wineType = pgEnum('wine_type', WINE_TYPE_KEYS)

// Postgres creates no index for a foreign key: every FK column leads an index (checked in schema.test.ts),
// otherwise each lookup by parent and each cascading delete scans the whole child table.

export const tastings = pgTable(
  'tasting',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    code: text('code').notNull().unique(),
    name: text('name').notNull(),
    /** Optional note from the host, shown under the name wherever it appears (not in the share image) */
    description: text('description'),
    blindTasting: boolean('blind_tasting').notNull().default(false),
    status: tastingStatus('status').notNull().default('setup'),
    scale: ratingScale('scale').notNull().default('five'),
    adminPinHash: text('admin_pin_hash').notNull(),
    pinFailedAttempts: integer('pin_failed_attempts').notNull().default(0),
    pinLockedUntil: timestamptz('pin_locked_until'),
    /** Lockouts since the last successful login – each one lasts twice as long (lockMinutes) */
    pinLockCount: integer('pin_lock_count').notNull().default(0),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
  },
  // purgeExpired deletes by age
  (t) => [index('tasting_created_at_idx').on(t.createdAt)],
).enableRLS()

export const wines = pgTable(
  'wine',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tastingId: uuid('tasting_id')
      .notNull()
      .references(() => tastings.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    winery: text('winery'),
    vintage: integer('vintage'),
    grapeVariety: text('grape_variety'),
    sweetness: wineSweetness('sweetness'),
    wineType: wineType('wine_type'),
    /** Taste description as printed or noted ("Süß & fruchtig") – free text, not the sweetness level */
    description: text('description'),
    /** Alcohol by volume in %, one decimal (13.5) */
    alcohol: numeric('alcohol', { precision: 3, scale: 1, mode: 'number' }),
  },
  (t) => [unique('wine_tasting_position_uq').on(t.tastingId, t.position)],
).enableRLS()

export const participants = pgTable(
  'participant',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tastingId: uuid('tasting_id')
      .notNull()
      .references(() => tastings.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    /** Part of the rejoin link's signature; raising it ("Link sperren") invalidates older links */
    rejoinVersion: integer('rejoin_version').notNull().default(0),
  },
  // Guest lists are shown in joining order
  (t) => [index('participant_tasting_id_idx').on(t.tastingId, t.createdAt)],
).enableRLS()

export const sessions = pgTable(
  'session',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    expiresAt: timestamptz('expires_at').notNull(),
  },
  (t) => [
    index('session_participant_id_idx').on(t.participantId),
    // purgeExpired deletes expired sessions daily – without it every run reads the whole table
    index('session_expires_at_idx').on(t.expiresAt),
  ],
).enableRLS()

export const ratingCriteria = pgTable(
  'rating_criteria',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tastingId: uuid('tasting_id')
      .notNull()
      .references(() => tastings.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    scaleMin: integer('scale_min').notNull().default(1),
    scaleMax: integer('scale_max').notNull().default(5),
    weight: smallint('weight').notNull().default(1),
    position: integer('position').notNull(),
  },
  // Not unique: criteria are renumbered one by one (see renumber in src/server/criteria.ts)
  (t) => [index('rating_criteria_tasting_id_idx').on(t.tastingId, t.position)],
).enableRLS()

export const ratings = pgTable(
  'rating',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    participantId: uuid('participant_id')
      .notNull()
      .references(() => participants.id, { onDelete: 'cascade' }),
    wineId: uuid('wine_id')
      .notNull()
      .references(() => wines.id, { onDelete: 'cascade' }),
    notes: text('notes'),
    createdAt: timestamptz('created_at').notNull().defaultNow(),
    updatedAt: timestamptz('updated_at').notNull().defaultNow(),
  },
  (t) => [
    unique('rating_participant_wine_uq').on(t.participantId, t.wineId),
    // Results and notes join a tasting's wines to their ratings
    index('rating_wine_id_idx').on(t.wineId),
  ],
).enableRLS()

export const ratingValues = pgTable(
  'rating_value',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    ratingId: uuid('rating_id')
      .notNull()
      .references(() => ratings.id, { onDelete: 'cascade' }),
    criterionId: uuid('criterion_id')
      .notNull()
      .references(() => ratingCriteria.id, { onDelete: 'cascade' }),
    value: smallint('value').notNull(),
  },
  (t) => [
    unique('rating_value_rating_criterion_uq').on(t.ratingId, t.criterionId),
    index('rating_value_criterion_id_idx').on(t.criterionId),
  ],
).enableRLS()
