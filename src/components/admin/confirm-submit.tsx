'use client'

import type { ReactNode } from 'react'
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
  hiddenFields?: Record<string, string>
  disabled?: boolean
}

/** Bestätigungsdialog vor unumkehrbaren Aktionen (Löschen, Tasting beenden). */
export function ConfirmSubmit({
  action,
  trigger,
  triggerLabel,
  triggerClassName,
  title,
  description,
  confirmLabel,
  hiddenFields = {},
  disabled,
}: ConfirmSubmitProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger disabled={disabled} aria-label={triggerLabel} className={triggerClassName}>
        {trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="ghost">Abbrechen</AlertDialogCancel>
          <form action={action}>
            {Object.entries(hiddenFields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <Button type="submit" className="w-full">
              {confirmLabel}
            </Button>
          </form>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
