'use client'

import { Shuffle } from 'lucide-react'
import { useActionState, useEffect, useId, useState } from 'react'
import {
  addWineAction,
  deleteWineAction,
  moveWineAction,
  shuffleWinesAction,
  updateWineAction,
} from '@/app/tasting/[code]/admin/actions'
import { RowActions } from '@/components/admin/row-actions'
import { FieldError } from '@/components/field-error'
import { GlassRing } from '@/components/glass-ring'
import { InfoPopover } from '@/components/info-popover'
import { RequiredLegend, RequiredMark } from '@/components/required-mark'
import { marginNote, textLink, textLinkFocus } from '@/components/styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FormAction } from '@/lib/action-state'
import { wineDetails, type WineLike } from '@/lib/tasting/display'
import {
  SHUFFLE_EXPLAIN_HINT,
  SHUFFLE_RUNNING_HINT,
  SHUFFLE_TOO_FEW_HINT,
  WINE_LOCK_HINT,
  WINE_REORDER_INFO,
  canShuffleWines,
  type TastingStatus,
} from '@/lib/tasting/rules'
import { SWEETNESS_KEYS, SWEETNESS_LABELS } from '@/lib/tasting/sweetness'
import { WINE_TYPE_KEYS, WINE_TYPE_LABELS } from '@/lib/tasting/wine-type'
import { cn } from '@/lib/utils'

type WineRowData = { id: string } & WineLike

/** Native select styled like <Input> – on phones it opens the system picker. */
function ChoiceField<K extends string>({
  id,
  name,
  label,
  keys,
  labels,
  defaultValue,
  errors,
  required,
}: {
  id: string
  name: string
  label: string
  keys: readonly K[]
  labels: Record<K, string>
  defaultValue: string
  errors?: string[]
  required?: boolean
}) {
  return (
    <div>
      <Label htmlFor={id}>
        {label}
        {required && <RequiredMark />}
      </Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        aria-required={required ? 'true' : undefined}
        aria-invalid={!!errors}
        className="mt-2 h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
      >
        <option value="">{required ? 'Bitte wählen' : 'keine Angabe'}</option>
        {keys.map((key) => (
          <option key={key} value={key}>
            {labels[key]}
          </option>
        ))}
      </select>
      <FieldError errors={errors} />
    </div>
  )
}

function WineForm({
  action,
  initial,
  submitLabel,
  onDone,
}: {
  action: FormAction
  initial?: WineRowData
  submitLabel: string
  onDone?: () => void
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const id = useId()
  const errors = state?.fieldErrors ?? {}
  const values = state?.values

  useEffect(() => {
    if (state?.ok) onDone?.()
  }, [state, onDone])

  return (
    <form action={formAction} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start">
      <RequiredLegend className="text-sm text-muted-foreground sm:col-span-2" />
      <div className="sm:col-span-2">
        <Label htmlFor={`${id}-name`}>
          Name
          <RequiredMark />
        </Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={values?.name ?? initial?.name}
          maxLength={80}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          className="mt-2 h-12"
        />
        <FieldError errors={errors.name} />
      </div>
      <ChoiceField
        id={`${id}-wine-type`}
        name="wineType"
        label="Weinart"
        keys={WINE_TYPE_KEYS}
        labels={WINE_TYPE_LABELS}
        defaultValue={values?.wineType ?? initial?.wineType ?? ''}
        errors={errors.wineType}
        required
      />
      <div>
        <Label htmlFor={`${id}-winery`}>Weingut</Label>
        <Input
          id={`${id}-winery`}
          name="winery"
          defaultValue={values?.winery ?? initial?.winery ?? ''}
          maxLength={80}
          aria-invalid={!!errors.winery}
          className="mt-2 h-12"
        />
        <FieldError errors={errors.winery} />
      </div>
      <div>
        <Label htmlFor={`${id}-vintage`}>Jahrgang</Label>
        <Input
          id={`${id}-vintage`}
          name="vintage"
          inputMode="numeric"
          defaultValue={values?.vintage ?? initial?.vintage ?? ''}
          maxLength={4}
          aria-invalid={!!errors.vintage}
          className="mt-2 h-12"
        />
        <FieldError errors={errors.vintage} />
      </div>
      <div>
        <Label htmlFor={`${id}-grape`}>Rebsorte</Label>
        <Input
          id={`${id}-grape`}
          name="grapeVariety"
          defaultValue={values?.grapeVariety ?? initial?.grapeVariety ?? ''}
          maxLength={60}
          aria-invalid={!!errors.grapeVariety}
          className="mt-2 h-12"
        />
        <FieldError errors={errors.grapeVariety} />
      </div>
      <ChoiceField
        id={`${id}-sweetness`}
        name="sweetness"
        label="Geschmacksrichtung"
        keys={SWEETNESS_KEYS}
        labels={SWEETNESS_LABELS}
        defaultValue={values?.sweetness ?? initial?.sweetness ?? ''}
        errors={errors.sweetness}
      />
      <div className="flex gap-2 sm:col-span-2">
        <Button type="submit" size="lg" className="h-12" disabled={pending}>
          {submitLabel}
        </Button>
        {onDone && (
          <Button type="button" variant="ghost" size="lg" className="h-12" onClick={onDone}>
            Abbrechen
          </Button>
        )}
      </div>
    </form>
  )
}

function WineRow({
  code,
  wine,
  isFirst,
  isLast,
  locked,
}: {
  code: string
  wine: WineRowData
  isFirst: boolean
  isLast: boolean
  locked: boolean
}) {
  const [editing, setEditing] = useState(false)
  const subtitle = wineDetails(wine)

  return (
    <li className="border-b border-border py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <GlassRing seed={wine.position} size={48}>
          <span className="font-display text-lg">{wine.position}</span>
        </GlassRing>
        <div className="min-w-40 flex-1">
          <p className="truncate font-medium">{wine.name}</p>
          {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <RowActions
          label={`Wein #${wine.position}`}
          moveUp={moveWineAction.bind(null, code, wine.id, 'up')}
          moveDown={moveWineAction.bind(null, code, wine.id, 'down')}
          upDisabled={isFirst}
          downDisabled={isLast}
          editLabel={`Wein #${wine.position} bearbeiten`}
          editing={editing}
          onToggleEdit={() => setEditing((v) => !v)}
          remove={{
            action: deleteWineAction.bind(null, code, wine.id),
            disabled: locked,
            label: `Wein #${wine.position} löschen`,
            title: `Wein #${wine.position} löschen?`,
            description:
              'Alle Bewertungen dieses Weins werden ebenfalls gelöscht. Die folgenden Weine rücken eine Nummer nach vorn.',
            confirmLabel: 'Löschen',
          }}
        />
      </div>
      {editing && (
        <div className="mt-3 pb-2">
          <WineForm
            action={updateWineAction.bind(null, code, wine.id)}
            initial={wine}
            submitLabel="Speichern"
            onDone={() => setEditing(false)}
          />
        </div>
      )}
    </li>
  )
}

/** Shuffles the wines nobody has rated yet. Hidden once the tasting is finished. */
function ShuffleControl({
  code,
  status,
  unratedCount,
  wineCount,
}: {
  code: string
  status: TastingStatus
  unratedCount: number
  wineCount: number
}) {
  const [state, action, pending] = useActionState(shuffleWinesAction.bind(null, code), undefined)
  const hintId = useId()
  const tooFew = unratedCount < 2
  if (!canShuffleWines(status)) return null

  return (
    <div className="grid grid-cols-1 gap-1">
      <p className="mb-1 text-sm text-muted-foreground">{SHUFFLE_EXPLAIN_HINT}</p>
      {(status === 'active' || unratedCount < wineCount) && <p className={cn(marginNote, 'mb-2')}>{SHUFFLE_RUNNING_HINT}</p>}
      <form action={action}>
        <button
          type="submit"
          disabled={tooFew || pending}
          aria-describedby={tooFew ? hintId : undefined}
          className={cn(textLink, textLinkFocus, 'gap-2 disabled:pointer-events-none disabled:opacity-50')}
        >
          <Shuffle className="size-4" aria-hidden />
          Reihenfolge mischen
        </button>
      </form>
      {tooFew && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {SHUFFLE_TOO_FEW_HINT}
        </p>
      )}
      <p role="status" aria-live="polite" className="min-h-5 text-sm">
        {state?.message && (
          <span
            key={state.values?.nonce}
            className={state.ok ? 'text-muted-foreground' : 'text-destructive'}
          >
            {state.message}
          </span>
        )}
      </p>
    </div>
  )
}

export function WineManager({
  code,
  wines,
  locked,
  status,
  unratedCount,
}: {
  code: string
  wines: WineRowData[]
  locked: boolean
  status: TastingStatus
  /** Wines nobody has rated yet – only these take part in the shuffle */
  unratedCount: number
}) {
  return (
    <div className="grid grid-cols-1 gap-8">
      {locked && (
        <div className="flex items-start gap-1">
          <p className={cn(marginNote, 'flex-1 self-center')}>{WINE_LOCK_HINT}</p>
          <InfoPopover label="Umsortieren oder falsch eingeschenkt?">{WINE_REORDER_INFO}</InfoPopover>
        </div>
      )}
      {wines.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Weine. Füg den ersten hinzu.</p>
      ) : (
        <ol className="grid grid-cols-1 border-t border-border">
          {wines.map((wine, i) => (
            <WineRow
              key={wine.id}
              code={code}
              wine={wine}
              isFirst={i === 0}
              isLast={i === wines.length - 1}
              locked={locked}
            />
          ))}
        </ol>
      )}
      {wines.length > 0 && <ShuffleControl code={code} status={status} unratedCount={unratedCount} wineCount={wines.length} />}
      <section aria-labelledby="add-wine-heading">
        <h2 id="add-wine-heading" className="mb-4 font-display text-xl font-medium">
          Wein #{wines.length + 1} hinzufügen
        </h2>
        <WineForm action={addWineAction.bind(null, code)} submitLabel="Wein hinzufügen" />
      </section>
    </div>
  )
}
