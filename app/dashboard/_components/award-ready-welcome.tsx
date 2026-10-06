'use client'

import Image from '@/components/safe-image'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight } from 'lucide-react'

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
      <DialogContent className="max-h-[min(88dvh,720px)] w-[calc(100%_-_32px)] max-w-md gap-0 overflow-y-auto rounded-[24px] border border-[#e8dccf] bg-white p-0 text-neutral-950 shadow-2xl">
        <div className="relative h-36 overflow-hidden rounded-t-[24px] bg-[#ffc51b] sm:h-44">
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
        <div className="space-y-3 px-5 pb-6 pt-5 text-left sm:px-7 sm:pb-7 sm:pt-6">
          <p className="text-xs font-semibold uppercase tracking-[0.13em] text-orange-800">Congratulations, {firstName}</p>
          <DialogTitle className="max-w-[18ch] text-[26px] font-semibold leading-[1.12] tracking-[-0.035em] sm:text-[30px]">Your Africa Future Leaders award is ready.</DialogTitle>
          <DialogDescription className="text-sm leading-6 text-neutral-600">
            Celebrate your recognition, strengthen your profile, and connect with the Africa Future Leaders community.
          </DialogDescription>
          <Link href="/dashboard/me/award" onClick={() => changeOpen(false)} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 font-semibold text-neutral-950 transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-700">
            View my award <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
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
