'use client'

import { useActionState, useEffect, useId, useState } from 'react'
import {
  addCriterionAction,
  deleteCriterionAction,
  moveCriterionAction,
  renameCriterionAction,
} from '@/app/tasting/[code]/admin/actions'
import { RowActions } from '@/components/admin/row-actions'
import { FieldError } from '@/components/field-error'
import { marginNote } from '@/components/styles'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FormAction } from '@/lib/action-state'
import { STRUCTURE_LOCK_HINT } from '@/lib/tasting/rules'

type CriterionData = { id: string; name: string; position: number }

function NameForm({
  action,
  initial,
  label,
  submitLabel,
  onDone,
}: {
  action: FormAction
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
  return (
    <li className="border-b border-border py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="w-6 text-right text-sm text-muted-foreground">{criterion.position}</span>
        <p className="min-w-40 flex-1 truncate font-medium">{criterion.name}</p>
        <RowActions
          label={criterion.name}
          moveUp={moveCriterionAction.bind(null, code, criterion.id, 'up')}
          moveDown={moveCriterionAction.bind(null, code, criterion.id, 'down')}
          upDisabled={locked || isFirst}
          downDisabled={locked || isLast}
          editLabel={`${criterion.name} umbenennen`}
          editing={editing}
          onToggleEdit={() => setEditing((v) => !v)}
          remove={{
            action: deleteCriterionAction.bind(null, code, criterion.id),
            disabled: locked || isOnly,
            label: `${criterion.name} entfernen`,
            title: `„${criterion.name}“ entfernen?`,
            description: 'Alle bereits vergebenen Sterne für dieses Kriterium werden gelöscht.',
            confirmLabel: 'Entfernen',
          }}
        />
      </div>
      {editing && (
        <div className="mt-3 pb-2">
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
      {locked && <p className={marginNote}>{STRUCTURE_LOCK_HINT}</p>}
      <ol className="grid grid-cols-1 border-t border-border">
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
        <section>
          <NameForm action={addCriterionAction.bind(null, code)} label="Kriterium hinzufügen" submitLabel="Hinzufügen" />
          <p className="mt-3 text-sm text-muted-foreground">
            Neue Kriterien gelten auch für bereits abgegebene Bewertungen – deine Gäste werden gebeten, sie zu ergänzen.
          </p>
        </section>
      )}
    </div>
  )
}
