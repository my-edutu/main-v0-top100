'use client'

import { ArrowRight, Sparkles } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

export function OnboardingWelcome({ name, open, onOpenChange }: {
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const firstName = name.trim().split(/\s+/)[0] || 'there'
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[min(88dvh,720px)] w-[calc(100%_-_32px)] max-w-md gap-3 overflow-y-auto rounded-[24px] border border-[#e8dccf] bg-white p-5 text-left text-neutral-950 shadow-2xl sm:p-8">
      <div aria-hidden="true" className="flex h-24 items-end rounded-2xl bg-[linear-gradient(120deg,#532420,#f97316_65%,#ffb347)] p-5 text-[#fff] sm:h-28">
        <Sparkles className="h-7 w-7" strokeWidth={1.5} />
      </div>
      <p className="pt-2 text-xs font-semibold uppercase tracking-[0.13em] text-orange-800">Welcome, {firstName}</p>
      <DialogTitle className="text-[28px] font-semibold leading-[1.1] tracking-[-0.035em] sm:text-3xl">You belong here.</DialogTitle>
      <DialogDescription className="text-sm leading-6 text-neutral-600">
        We’re delighted to welcome you to Africa Future Leaders. Your work and your story deserve to be seen.
      </DialogDescription>
      <button autoFocus type="button" onClick={() => onOpenChange(false)} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-400 px-4 font-semibold text-neutral-950 hover:bg-orange-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">
        Let’s get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="text-center text-xs text-neutral-500">Five simple steps to make your profile yours.</p>
    </DialogContent>
  </Dialog>
}
