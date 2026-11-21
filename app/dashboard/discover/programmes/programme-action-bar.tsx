import type { ReactNode } from 'react'

export const programmeActionClass = 'flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#ffdf45] px-5 text-base font-bold text-[#211d19] transition-colors hover:bg-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#9a3412]'

export function ProgrammeActionBar({ children }: { children: ReactNode }) {
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 lg:left-[88px] xl:left-[240px] xl:px-8">
      <div className="mx-auto max-w-3xl">{children}</div>
    </footer>
  )
}
