'use client'

import { useActionState, useEffect, useId, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { addWineAction, deleteWineAction, moveWineAction, updateWineAction } from '@/app/tasting/[code]/admin/actions'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { FieldError } from '@/components/field-error'
import { GlassRing } from '@/components/glass-ring'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionState } from '@/lib/action-state'
import { wineDetails } from '@/lib/tasting/display'
import { STRUCTURE_LOCK_HINT } from '@/lib/tasting/rules'
import { SWEETNESS_KEYS, SWEETNESS_LABELS, type Sweetness } from '@/lib/tasting/sweetness'
import { WINE_TYPE_KEYS, WINE_TYPE_LABELS, type WineType } from '@/lib/tasting/wine-type'
import { cn } from '@/lib/utils'

type WineRowData = {
  id: string
  position: number
  name: string
  vintage: number | null
  grapeVariety: string | null
  sweetness: Sweetness | null
  wineType: WineType | null
}
type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>

/** Natives Auswahlfeld im Stil von <Input> – auf dem Handy öffnet sich die Systemauswahl. */
function ChoiceField<K extends string>({
  id,
  name,
  label,
  keys,
  labels,
  defaultValue,
  errors,
}: {
  id: string
  name: string
  label: string
  keys: readonly K[]
  labels: Record<K, string>
  defaultValue: string
  errors?: string[]
}) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        aria-invalid={!!errors}
        className="mt-2 h-12 w-full rounded-lg border border-input bg-transparent px-2.5 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive md:text-sm dark:bg-input/30"
      >
        <option value="">keine Angabe</option>
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
      <div className="sm:col-span-2">
        <Label htmlFor={`${id}-name`}>Name</Label>
        <Input
          id={`${id}-name`}
          name="name"
          defaultValue={values?.name ?? initial?.name}
          maxLength={80}
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
      />
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
  const iconButton = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-12')

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
        <div className="-mr-2 ml-auto flex shrink-0">
          <form action={moveWineAction.bind(null, code, wine.id, 'up')}>
            <button type="submit" disabled={locked || isFirst} aria-label={`Wein #${wine.position} nach oben`} className={iconButton}>
              <ArrowUp className="size-5" />
            </button>
          </form>
          <form action={moveWineAction.bind(null, code, wine.id, 'down')}>
            <button type="submit" disabled={locked || isLast} aria-label={`Wein #${wine.position} nach unten`} className={iconButton}>
              <ArrowDown className="size-5" />
            </button>
          </form>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label={`Wein #${wine.position} bearbeiten`}
            aria-expanded={editing}
            className={iconButton}
          >
            <Pencil className="size-5" />
          </button>
          <ConfirmSubmit
            action={deleteWineAction.bind(null, code, wine.id)}
            trigger={<Trash2 className="size-5" />}
            triggerLabel={`Wein #${wine.position} löschen`}
            disabled={locked}
            triggerClassName={iconButton}
            title={`Wein #${wine.position} löschen?`}
            description="Alle Bewertungen dieses Weins werden ebenfalls gelöscht. Die folgenden Weine rücken eine Nummer nach vorn."
            confirmLabel="Löschen"
          />
        </div>
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

export function WineManager({ code, wines, locked }: { code: string; wines: WineRowData[]; locked: boolean }) {
  return (
    <div className="grid grid-cols-1 gap-8">
      {locked && <p className="border-l-2 border-wine pl-3 text-sm text-muted-foreground">{STRUCTURE_LOCK_HINT}</p>}
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
      <section aria-labelledby="add-wine-heading">
        <h2 id="add-wine-heading" className="mb-4 font-display text-xl font-medium">
          Wein #{wines.length + 1} hinzufügen
        </h2>
        <WineForm action={addWineAction.bind(null, code)} submitLabel="Wein hinzufügen" />
      </section>
    </div>
  )
}
