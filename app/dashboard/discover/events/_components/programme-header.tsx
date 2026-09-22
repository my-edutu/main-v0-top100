import { CalendarRange, Sparkles } from 'lucide-react'

export function ProgrammeHeader({ nextTitle }: { nextTitle?: string | null }) {
  return (
    <header className="programme-header">
      <div className="programme-header-orbit programme-header-orbit-one" />
      <div className="programme-header-orbit programme-header-orbit-two" />
      <div className="relative z-10 max-w-3xl">
        <p className="programme-kicker"><Sparkles aria-hidden="true" className="h-3.5 w-3.5" />Africa Future Leaders · October 2026</p>
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold leading-[0.98] tracking-[-0.06em] text-white sm:text-6xl">Leadership that moves from insight to impact.</h1>
        <p className="mt-5 max-w-xl text-sm leading-6 text-orange-50/75 sm:text-base">Ten focused virtual conversations across three weeks—designed to sharpen how Africa’s future leaders think, build, and lead.</p>
        <div className="mt-7 flex flex-wrap items-center gap-3 text-xs font-medium text-orange-50/80">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2"><CalendarRange aria-hidden="true" className="h-4 w-4 text-orange-200" />10–31 October · WAT</span>
          {nextTitle ? <span className="rounded-full border border-orange-200/30 bg-orange-200/10 px-3 py-2">Next: {nextTitle}</span> : null}
        </div>
      </div>
    </header>
  )
}
