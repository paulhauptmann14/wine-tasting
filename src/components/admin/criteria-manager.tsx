'use client'

import { useActionState, useEffect, useId, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import {
  addCriterionAction,
  deleteCriterionAction,
  moveCriterionAction,
  renameCriterionAction,
} from '@/app/tasting/[code]/admin/actions'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { FieldError } from '@/components/field-error'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { ActionState } from '@/lib/action-state'
import { STRUCTURE_LOCK_HINT } from '@/lib/tasting/rules'
import { cn } from '@/lib/utils'

type CriterionData = { id: string; name: string; position: number }

function NameForm({
  action,
  initial,
  label,
  submitLabel,
  onDone,
}: {
  action: (prev: ActionState, fd: FormData) => Promise<ActionState>
  initial?: string
  label: string
  submitLabel: string
  onDone?: () => void
}) {
  const [state, formAction, pending] = useActionState(action, undefined)
  const id = useId()
  useEffect(() => {
    if (state?.ok) onDone?.()
  }, [state, onDone])
  return (
    <form action={formAction} noValidate className="flex flex-wrap items-start gap-2">
      <div className="min-w-48 flex-1">
        <Label htmlFor={id}>{label}</Label>
        <Input
          id={id}
          name="name"
          defaultValue={state?.values?.name ?? initial}
          maxLength={40}
          aria-invalid={!!state?.fieldErrors?.name}
          className="mt-2 h-12"
        />
        <FieldError errors={state?.fieldErrors?.name} />
      </div>
      <Button type="submit" size="lg" className="mt-7 h-12" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  )
}

function CriterionRow({
  code,
  criterion,
  isFirst,
  isLast,
  isOnly,
  locked,
}: {
  code: string
  criterion: CriterionData
  isFirst: boolean
  isLast: boolean
  isOnly: boolean
  locked: boolean
}) {
  const [editing, setEditing] = useState(false)
  const iconButton = cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'size-12')
  return (
    <li className="rounded-2xl bg-card p-4">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="w-6 text-right text-sm text-muted-foreground">{criterion.position}</span>
        <p className="min-w-40 flex-1 truncate font-medium">{criterion.name}</p>
        <div className="-mr-2 ml-auto flex shrink-0">
          <form action={moveCriterionAction.bind(null, code, criterion.id, 'up')}>
            <button type="submit" disabled={locked || isFirst} aria-label={`${criterion.name} nach oben`} className={iconButton}>
              <ArrowUp className="size-5" />
            </button>
          </form>
          <form action={moveCriterionAction.bind(null, code, criterion.id, 'down')}>
            <button type="submit" disabled={locked || isLast} aria-label={`${criterion.name} nach unten`} className={iconButton}>
              <ArrowDown className="size-5" />
            </button>
          </form>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            aria-label={`${criterion.name} umbenennen`}
            aria-expanded={editing}
            className={iconButton}
          >
            <Pencil className="size-5" />
          </button>
          <ConfirmSubmit
            action={deleteCriterionAction.bind(null, code, criterion.id)}
            trigger={<Trash2 className="size-5" />}
            triggerLabel={`${criterion.name} entfernen`}
            triggerClassName={iconButton}
            disabled={locked || isOnly}
            title={`„${criterion.name}“ entfernen?`}
            description="Alle bereits vergebenen Sterne für dieses Kriterium werden gelöscht."
            confirmLabel="Entfernen"
          />
        </div>
      </div>
      {editing && (
        <div className="mt-4 border-t border-border pt-4">
          <NameForm
            action={renameCriterionAction.bind(null, code, criterion.id)}
            initial={criterion.name}
            label="Neuer Name"
            submitLabel="Speichern"
            onDone={() => setEditing(false)}
          />
        </div>
      )}
    </li>
  )
}

export function CriteriaManager({
  code,
  criteria,
  locked,
}: {
  code: string
  criteria: CriterionData[]
  locked: boolean
}) {
  return (
    <div className="grid grid-cols-1 gap-8">
      {locked && <p className="rounded-2xl bg-card px-4 py-3 text-sm text-muted-foreground">{STRUCTURE_LOCK_HINT}</p>}
      <ol className="grid grid-cols-1 gap-2">
        {criteria.map((c, i) => (
          <CriterionRow
            key={c.id}
            code={code}
            criterion={c}
            isFirst={i === 0}
            isLast={i === criteria.length - 1}
            isOnly={criteria.length === 1}
            locked={locked}
          />
        ))}
      </ol>
      {!locked && (
        <section className="rounded-2xl border border-dashed border-border p-4">
          <NameForm action={addCriterionAction.bind(null, code)} label="Kriterium hinzufügen" submitLabel="Hinzufügen" />
          <p className="mt-3 text-sm text-muted-foreground">
            Neue Kriterien gelten auch für bereits abgegebene Bewertungen – deine Gäste werden gebeten, sie zu ergänzen.
          </p>
        </section>
      )}
    </div>
  )
}
