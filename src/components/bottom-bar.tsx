import type { ReactNode } from 'react'

/** Mobile: fixed to the bottom edge (thumb zone). From lg: normal flow. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none">
      <div className="mx-auto w-full max-w-[480px] lg:max-w-none">{children}</div>
    </div>
  )
}
