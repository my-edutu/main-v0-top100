'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, Award } from 'lucide-react'

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

const sessionKey = (memberId: string) => `afl:award-ready-seen:${memberId}`

export function AwardReadyWelcome({ memberId, name }: { memberId: string; name: string }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      if (!window.sessionStorage.getItem(sessionKey(memberId))) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [memberId])

  function changeOpen(next: boolean) {
    setOpen(next)
    if (!next) {
      try { window.sessionStorage.setItem(sessionKey(memberId), '1') } catch { /* Storage may be unavailable. */ }
    }
  }

  const firstName = name.trim().split(/\s+/)[0] || 'there'
  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_32px)] max-w-lg overflow-y-auto rounded-3xl border-amber-200 bg-white p-0 text-neutral-950">
        <div className="relative h-48 overflow-hidden rounded-t-3xl bg-[#ffc51b] sm:h-56">
          <Image
            src="/blog/Top100 Africa Future Leaders patners with one young world.png"
            alt="One Young World and Africa Future Leaders"
            fill
            priority
            sizes="(max-width: 640px) 100vw, 512px"
            className="object-cover object-center"
          />
          <span
            aria-hidden="true"
            className="absolute left-[86.5%] top-1/2 flex aspect-square w-[9.4%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#FFF9F6] text-[clamp(13px,4.8vw,24px)] font-black tracking-[-0.08em] text-black"
          >
            26
          </span>
        </div>
        <div className="space-y-4 px-6 pb-7 text-center sm:px-9 sm:pb-9">
          <div className="mx-auto -mt-9 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-neutral-950 text-amber-300 shadow-sm">
            <Award className="h-8 w-8" aria-hidden="true" />
          </div>
          <p className="text-sm font-medium text-orange-800">Congratulations, {firstName}!</p>
          <DialogTitle className="text-3xl font-semibold leading-tight">Your Africa Future Leaders award is ready.</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-neutral-600">
            Pay the award fee securely through Bachs. Delivery and its charge will be handled separately in a later step.
          </DialogDescription>
          <Link href="/dashboard/me/award" onClick={() => changeOpen(false)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-medium text-neutral-950 hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700">
            View my award <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <button type="button" onClick={() => changeOpen(false)} className="min-h-10 text-sm text-neutral-500 underline underline-offset-4 hover:text-neutral-800">I’ll view it later</button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function clearAwardReadyWelcome(memberId?: string) {
  if (typeof window === 'undefined') return
  if (memberId) {
    window.sessionStorage.removeItem(sessionKey(memberId))
    return
  }
  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const key = window.sessionStorage.key(index)
    if (key?.startsWith('afl:award-ready-seen:')) window.sessionStorage.removeItem(key)
  }
}
