/** Id of the error text under the field with id `fieldId`. */
export const errorId = (fieldId: string) => `${fieldId}-error`

/**
 * aria-describedby for a field: its error text (while there is one) first, then hints or scan notes.
 * Undefined when nothing applies, so the attribute is left out.
 */
export function describedBy(
  fieldId: string,
  errors: string[] | undefined,
  ...otherIds: (string | false | null | undefined)[]
): string | undefined {
  const ids = [errors?.length ? errorId(fieldId) : undefined, ...otherIds].filter(Boolean)
  return ids.length ? ids.join(' ') : undefined
}

/** First error of a field. Point the field at it with `aria-describedby={describedBy(fieldId, errors)}`. */
export function FieldError({ errors, fieldId }: { errors?: string[]; fieldId: string }) {
  if (!errors?.length) return null
  return (
    <p id={errorId(fieldId)} className="mt-1.5 text-sm text-destructive">
      {errors[0]}
    </p>
  )
}
