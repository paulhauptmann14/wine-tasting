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
import { STRUCTURE_LOCK_HINT } from '@/lib/tasting/rules'
import { cn } from '@/lib/utils'

type WineRowData = { id: string; position: number; name: string; vintage: number | null; grapeVariety: string | null }
type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>

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
    <form action={formAction} noValidate className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr_1.5fr] sm:items-start">
      <div>
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
      <div className="flex gap-2 sm:col-span-3">
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
  const subtitle = [wine.vintage, wine.grapeVariety].filter(Boolean).join(' · ')
  const iconButton = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-12')

  return (
    <li className="rounded-2xl bg-card p-4">
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
        <div className="mt-4 border-t border-border pt-4">
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
      {locked && <p className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">{STRUCTURE_LOCK_HINT}</p>}
      {wines.length === 0 ? (
        <p className="text-muted-foreground">Noch keine Weine. Füg den ersten hinzu.</p>
      ) : (
        <ol className="grid grid-cols-1 gap-2">
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
      <section aria-labelledby="add-wine-heading" className="rounded-2xl border border-dashed border-border p-4">
        <h2 id="add-wine-heading" className="mb-4 font-medium">
          Wein #{wines.length + 1} hinzufügen
        </h2>
        <WineForm action={addWineAction.bind(null, code)} submitLabel="Wein hinzufügen" />
      </section>
    </div>
  )
}
