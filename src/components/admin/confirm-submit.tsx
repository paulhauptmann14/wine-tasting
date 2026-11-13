'use client'

import { useState, type ReactNode } from 'react'
import { useFormStatus } from 'react-dom'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'

type ConfirmSubmitProps = {
  action: (formData: FormData) => void | Promise<void>
  trigger: ReactNode
  triggerLabel?: string
  triggerClassName?: string
  title: string
  description: string
  confirmLabel: string
  /** Shown on the disabled confirm button while a slow action runs */
  pendingLabel?: string
  hiddenFields?: Record<string, string>
  disabled?: boolean
}

/** Disabled while its form's action runs, so a second tap can't fire it again. */
function ConfirmButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

/**
 * Confirmation dialog before irreversible or disruptive actions (deleting, finishing, pausing the tasting).
 * The dialog stays open, its confirm button disabled, until the action is done – for raw server actions
 * and useActionState dispatches alike: React ties `setOpen(false)` to the form action's transition.
 */
export function ConfirmSubmit({
  action,
  trigger,
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
  pendingLabel = 'Einen Moment …',
  hiddenFields = {},
  disabled,
}: ConfirmSubmitProps) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger disabled={disabled} aria-label={triggerLabel} className={triggerClassName}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Abbrechen</AlertDialogCancel>
          <form
            action={(fd) => {
              setOpen(false)
              return action(fd)
            }}
          >
            {Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <ConfirmButton label={confirmLabel} pendingLabel={pendingLabel} />
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
