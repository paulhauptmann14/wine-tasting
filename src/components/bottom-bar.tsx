import type { ReactNode } from 'react'

/** Mobile: fixed to the bottom edge (thumb zone) as a translucent material. From lg: normal flow. */
export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="material-bar fixed inset-x-0 bottom-0 z-20 px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] lg:static lg:mt-10 lg:border-0 lg:bg-transparent lg:p-0 lg:backdrop-blur-none lg:before:hidden">
      <div className="mx-auto w-full max-w-[480px] lg:max-w-none">{children}</div>
    </div>
  )
}
