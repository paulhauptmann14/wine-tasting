/** Rückgabe von Server Actions, die mit useActionState genutzt werden. */
export type ActionState =
  | {
      ok?: boolean
      message?: string
      fieldErrors?: Record<string, string[] | undefined>
      values?: Record<string, string>
    }
  | undefined
