import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core'

const timestamptz = (name: string) => timestamp(name, { withTimezone: true })

export const tastingStatus = pgEnum('tasting_status', ['setup', 'active', 'finished'])
export const wineSweetness = pgEnum('wine_sweetness', ['dry', 'off_dry', 'medium', 'sweet'])

export const tastings = pgTable('tasting', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  blindTasting: boolean('blind_tasting').notNull().default(false),
  guessingEnabled: boolean('guessing_enabled').notNull().default(false),
  status: tastingStatus('status').notNull().default('setup'),
  adminPinHash: text('admin_pin_hash').notNull(),
  pinFailedAttempts: integer('pin_failed_attempts').notNull().default(0),
  pinLockedUntil: timestamptz('pin_locked_until'),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
}).enableRLS()

export const wines = pgTable(
  'wine',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tastingId: uuid('tasting_id')
      .notNull()
      .references(() => tastings.id, { onDelete: 'cascade' }),
    position: integer('position').notNull(),
    name: text('name').notNull(),
    vintage: integer('vintage'),
    grapeVariety: text('grape_variety'),
    sweetness: wineSweetness('sweetness'),
  },
  (t) => [unique('wine_tasting_position_uq').on(t.tastingId, t.position)],
).enableRLS()

export const participants = pgTable('participant', {
  id: uuid('id').primaryKey().defaultRandom(),
  tastingId: uuid('tasting_id')
    .notNull()
    .references(() => tastings.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
}).enableRLS()

export const sessions = pgTable('session', {
  id: uuid('id').primaryKey().defaultRandom(),
  participantId: uuid('participant_id')
    .notNull()
    .references(() => participants.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  createdAt: timestamptz('created_at').notNull().defaultNow(),
  expiresAt: timestamptz('expires_at').notNull(),
}).enableRLS()

export const ratingCriteria = pgTable('rating_criteria', {
  id: uuid('id').primaryKey().defaultRandom(),
  tastingId: uuid('tasting_id')
    .notNull()
    .references(() => tastings.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull().default('stars'),
  scaleMin: integer('scale_min').notNull().default(1),
  scaleMax: integer('scale_max').notNull().default(5),
  position: integer('position').notNull(),
}).enableRLS()

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
  (t) => [unique('rating_participant_wine_uq').on(t.participantId, t.wineId)],
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
  (t) => [unique('rating_value_rating_criterion_uq').on(t.ratingId, t.criterionId)],
).enableRLS()
