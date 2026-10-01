export function FieldError({ errors, id }: { errors?: string[]; id?: string }) {
  if (!errors?.length) return null
  return (
    <p id={id} className="mt-1.5 text-sm text-destructive">
      {errors[0]}
    </p>
  )
}
