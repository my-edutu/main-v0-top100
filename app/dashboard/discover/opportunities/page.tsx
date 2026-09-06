'use client'

import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog'

export default function OpportunitiesPage() {
  const [open, setOpen] = useState(true)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <section className="space-y-3 py-6">
        <h1 className="text-xl font-medium">Opportunities with Edutu</h1>
        <p className="text-sm leading-6 text-stone-600">AI-powered opportunities for Top100 awardees.</p>
        <DialogTrigger asChild><button className="min-h-12 rounded-xl border px-5 text-sm font-medium">View your invitation</button></DialogTrigger>
      </section>
      <DialogContent className="max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-2xl border-stone-200 bg-white p-6 shadow-none">
        <p className="pr-8 text-xs font-medium uppercase tracking-widest text-orange-700">Top100 × Edutu</p>
        <DialogTitle className="text-2xl font-medium leading-tight">You’re exclusively invited.</DialogTitle>
        <DialogDescription className="text-sm leading-6 text-stone-600">
          We’re partnering with Edutu to provide AI-powered opportunities for our awardees. As a Top100 awardee, you’re exclusively invited to try it.
        </DialogDescription>
        <a href="https://www.edutu.org" className="mt-2 flex min-h-12 items-center justify-center gap-3 rounded-xl px-5 text-sm font-medium text-black" style={{background:'linear-gradient(90deg,#f97316,#fb923c,#f59e0b)'}}>
          Enter Edutu <ArrowUpRight size={18} aria-hidden="true" />
        </a>
        <p className="text-center text-xs text-stone-500">You’ll continue to www.edutu.org.</p>
      </DialogContent>
    </Dialog>
  )
}
