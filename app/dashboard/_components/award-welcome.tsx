'use client'

import { useState } from 'react'
import { Trophy } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { formatNaira } from '@/lib/awards/money'

export function AwardWelcome({ name, price, preview }: { name: string; price: number; preview: boolean }) {
  const [open, setOpen] = useState(true)
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogContent overlayClassName="award-welcome-backdrop" className="max-h-[85dvh] w-[calc(100%_-_32px)] max-w-md overflow-y-auto rounded-2xl bg-white p-6 text-neutral-950 sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-800"><Trophy size={24} aria-hidden="true" /></div>
      <DialogTitle className="pr-4 text-2xl font-medium leading-tight">Congratulations, {name.split(' ')[0]}!</DialogTitle>
      <DialogDescription className="text-sm leading-6 text-neutral-600">Your award is issued by Africa Future Leaders and One Young World, recognising your achievement and impact.</DialogDescription>
      <div className="rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="text-xs text-neutral-600">{preview ? 'Award cost · local preview' : 'Award cost'}</p><p className="mt-1 text-3xl font-medium">{Number.isFinite(price) ? formatNaira(price) : 'Confirmed before payment'}</p><p className="mt-2 text-xs leading-5 text-neutral-600">Shipping is additional. You’ll see the delivery quote and full total before paying.</p></div>
      <p className="text-sm leading-6 text-neutral-600">Receive your award at the Africa Future Leaders programme or have it shipped to your location. For programme collection arrangements, contact the team; the form below is for delivery.</p>
      <a href="mailto:info@top100afl.com" className="inline-flex min-h-11 items-center text-sm text-orange-800 underline underline-offset-4">Ask about programme collection</a>
      <button type="button" onClick={() => setOpen(false)} className="min-h-12 w-full rounded-xl px-5 font-medium text-black" style={{ background:'linear-gradient(90deg,#f97316,#fb923c,#f59e0b)' }}>Continue to delivery details</button>
    </DialogContent>
  </Dialog>
}
