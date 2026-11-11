/** Return value of server actions used with useActionState. */
export type ActionState =
  | {
      ok?: boolean
      message?: string
      fieldErrors?: Record<string, string[] | undefined>
      values?: Record<string, string>
    }
  | undefined

/** Server action as useActionState expects it. */
export type FormAction = (prev: ActionState, fd: FormData) => Promise<ActionState>
