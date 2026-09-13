'use client'

import { ArrowRight, PartyPopper } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

export function OnboardingWelcome({ name, open, onOpenChange }: {
  name: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const firstName = name.trim().split(/\s+/)[0] || 'there'
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-h-[90dvh] w-[calc(100%_-_32px)] max-w-lg overflow-y-auto rounded-3xl border-orange-100 bg-white p-6 text-center text-neutral-950 sm:p-10">
      <div aria-hidden="true" className="relative mx-auto h-36 w-full overflow-hidden">
        {['#fb923c', '#c4b5fd', '#fbbf24', '#99dace', '#fdba74'].map((color, index) => (
          <span key={color} className="welcome-balloon absolute top-3 h-16 w-12 rounded-[50%] shadow-inner" style={{ backgroundColor: color, left: `${8 + index * 18}%`, animationDelay: `${index * -.7}s` }}>
            <span className="absolute left-3 top-3 h-5 w-2 rounded-full bg-white/50" />
            <span className="absolute -bottom-1 left-5 h-2 w-2 rotate-45" style={{ backgroundColor: color }} />
            <span className="absolute left-6 top-[68px] h-12 w-px bg-neutral-300" />
          </span>
        ))}
      </div>
      <p className="text-sm font-medium text-orange-800">Hello, {firstName}. Welcome to Top100!</p>
      <DialogTitle className="text-3xl font-semibold leading-tight sm:text-4xl">Congratulations.<br />You belong here.</DialogTitle>
      <DialogDescription className="text-base leading-7 text-neutral-600">
        We’re delighted to welcome you to Africa Future Leaders. Your work and your story deserve to be seen.
      </DialogDescription>
      <p className="flex items-center justify-center gap-2 text-sm text-neutral-600"><PartyPopper className="h-5 w-5 shrink-0 text-orange-600" aria-hidden="true" />Let’s introduce you to your community.</p>
      <button autoFocus type="button" onClick={() => onOpenChange(false)} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 font-medium text-neutral-950 hover:bg-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600">
        Let’s get started <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </button>
      <p className="text-xs text-neutral-500">Five simple steps to make your profile yours.</p>
      <style jsx>{`
        @keyframes welcome-float {
          0%, 100% { transform: translateY(8px) rotate(-5deg); }
          50% { transform: translateY(-6px) rotate(5deg); }
        }
        .welcome-balloon { animation: welcome-float 3.5s ease-in-out 3; }
        @media (prefers-reduced-motion: reduce) {
          .welcome-balloon { animation: none; }
        }
      `}</style>
    </DialogContent>
  </Dialog>
}
