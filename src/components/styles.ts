// Shared class strings of the "Probierbogen" look – no 'use client', so Server and Client Components can use them

/** Secondary action as an underlined text link; callers add layout extras via cn() */
export const textLink =
  'inline-flex h-12 items-center font-medium underline decoration-border decoration-2 underline-offset-[6px] transition-opacity duration-100 hover:decoration-wine active:opacity-50'
/** Focus shown as the wine-red underline instead of the outline */
export const textLinkFocus = 'outline-none focus-visible:decoration-wine'

/** Quiet "‹ Zurück" link above the title */
export const backLink =
  'inline-flex h-12 items-center text-sm text-muted-foreground hover:text-foreground transition-opacity duration-100 active:opacity-50'

/** Hint as a margin note with the wine-red rule */
export const marginNote = 'border-l-2 border-wine pl-3 text-sm text-muted-foreground'
