import { describedBy, FieldError } from '@/components/field-error'
import { RequiredMark } from '@/components/required-mark'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { LIMITS } from '@/lib/limits'
import { cn } from '@/lib/utils'

/**
 * Name (required) and description of a tasting – the same two fields when creating it and in the
 * settings. The form around them renders one <RequiredLegend />.
 */
export function TastingDetailsFields({
  idPrefix = '',
  defaultName,
  defaultDescription,
  errors,
  namePlaceholder,
  fieldClassName,
}: {
  /** Prepended to every id ("settings-" → "settings-name"), so two forms on one page don't collide */
  idPrefix?: string
  defaultName?: string
  defaultDescription?: string
  errors: { name?: string[]; description?: string[] }
  namePlaceholder?: string
  /** Extra classes for both fields, e.g. a background */
  fieldClassName?: string
}) {
  const nameId = `${idPrefix}name`
  const descriptionId = `${idPrefix}description`
  const hintId = `${descriptionId}-hint`
  return (
    <>
      <div>
        <Label htmlFor={nameId}>
          Name der Verkostung
          <RequiredMark />
        </Label>
        <Input
          id={nameId}
          name="name"
          defaultValue={defaultName}
          placeholder={namePlaceholder}
          maxLength={LIMITS.tastingName}
          required
          aria-required="true"
          aria-invalid={!!errors.name}
          aria-describedby={describedBy(nameId, errors.name)}
          className={cn('mt-2 h-12 text-base', fieldClassName)}
        />
        <FieldError fieldId={nameId} errors={errors.name} />
      </div>

      <div>
        <Label htmlFor={descriptionId}>Beschreibung</Label>
        <Textarea
          id={descriptionId}
          name="description"
          defaultValue={defaultDescription}
          placeholder="Rieslinge von der Mosel. Bring gern Brot mit."
          maxLength={LIMITS.tastingDescription}
          rows={2}
          aria-invalid={!!errors.description}
          aria-describedby={describedBy(descriptionId, errors.description, hintId)}
          className={cn('mt-2 min-h-12 text-base', fieldClassName)}
        />
        <p id={hintId} className="mt-1.5 text-sm text-muted-foreground">
          Optional. Steht unter dem Namen, für alle mit dem Code sichtbar.
        </p>
        <FieldError fieldId={descriptionId} errors={errors.description} />
      </div>
    </>
  )
}
