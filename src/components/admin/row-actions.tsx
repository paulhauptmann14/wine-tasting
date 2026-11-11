import { ArrowDown, ArrowUp, Pencil, Trash2 } from 'lucide-react'
import { ConfirmSubmit } from '@/components/admin/confirm-submit'
import { iconButtonClass } from '@/components/ui/button'

type Submit = (formData: FormData) => void | Promise<void>

/** Move up/down, edit and delete for one row of the host's lists (wines, criteria). Client-side only. */
export function RowActions({
  label,
  moveUp,
  moveDown,
  upDisabled,
  downDisabled,
  editLabel,
  editing,
  onToggleEdit,
  remove,
}: {
  /** Names the row in the button labels, e.g. "Wein #2" */
  label: string
  moveUp: Submit
  moveDown: Submit
  upDisabled: boolean
  downDisabled: boolean
  editLabel: string
  editing: boolean
  onToggleEdit: () => void
  remove: { action: Submit; disabled: boolean; label: string; title: string; description: string; confirmLabel: string }
}) {
  return (
    <div className="-mr-2 ml-auto flex shrink-0">
      <form action={moveUp}>
        <button type="submit" disabled={upDisabled} aria-label={`${label} nach oben`} className={iconButtonClass}>
          <ArrowUp className="size-5" />
        </button>
      </form>
      <form action={moveDown}>
        <button type="submit" disabled={downDisabled} aria-label={`${label} nach unten`} className={iconButtonClass}>
          <ArrowDown className="size-5" />
        </button>
      </form>
      <button
        type="button"
        onClick={onToggleEdit}
        aria-label={editLabel}
        aria-expanded={editing}
        className={iconButtonClass}
      >
        <Pencil className="size-5" />
      </button>
      <ConfirmSubmit
        action={remove.action}
        trigger={<Trash2 className="size-5" />}
        triggerLabel={remove.label}
        triggerClassName={iconButtonClass}
        disabled={remove.disabled}
        title={remove.title}
        description={remove.description}
        confirmLabel={remove.confirmLabel}
      />
    </div>
  )
}
