/** Return value of server actions used with useActionState. */
export type ActionState =
  | {
      ok?: boolean
      message?: string
      fieldErrors?: Record<string, string[] | undefined>
      values?: Record<string, string>
    }
  | undefined
