'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from '@/components/safe-image'
import { ArrowUpRight, CalendarDays, Download, MapPin, Ticket } from 'lucide-react'
import { RouteSection } from '../../_components/route-section'
import { festivalRequest } from '@/lib/festival/client'
import { FESTIVAL_ADDRESS, FESTIVAL_DATE, FESTIVAL_DIRECTIONS_URL, FESTIVAL_IMAGE, FESTIVAL_TICKET_PATH, FESTIVAL_TIME, FESTIVAL_VENUE } from '@/lib/festival/config'
import type { FestivalInterestView } from '@/lib/festival/interest'

export default function FestivalTicketPage() {
  const [view, setView] = useState<FestivalInterestView | null>(null)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    festivalRequest<FestivalInterestView>('/api/member/festival-interest', { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setView(data) })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Your ticket is temporarily unavailable.')
      })
    return () => controller.abort()
  }, [retry])

  const ticket = view?.payment === 'confirmed' ? view.ticket : null
  const interest = view?.interest
  const unavailable = view?.payment === 'unavailable'

  if (!ticket || !interest || error) {
    return (
      <RouteSection title="Your festival ticket">
        <div className="max-w-lg rounded-2xl border border-stone-200 bg-white p-5">
          {error || unavailable ? (
            <>
              <p role="alert">{error || 'We couldn’t verify your award payment. Try again shortly.'}</p>
              <button type="button" className="mt-3 min-h-11 underline underline-offset-4" onClick={() => { setError(''); setView(null); setRetry(retry + 1) }}>Try again</button>
            </>
          ) : !view ? <p role="status">Loading your ticket…</p> : (
            <>
              <p>{view.payment === 'confirmed' ? 'Register for the festival to get your ticket.' : 'Your ticket will be available after your award payment is confirmed and your festival registration is complete.'}</p>
              <Link href="/dashboard/festival" className="mt-3 inline-flex min-h-11 items-center font-medium underline underline-offset-4">Open festival registration</Link>
            </>
          )}
        </div>
      </RouteSection>
    )
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-4 pb-6">
      <article aria-labelledby="festival-pass-title" className="overflow-hidden rounded-[1.5rem] border border-stone-200 bg-white text-stone-950">
        <header className="relative isolate overflow-hidden bg-stone-950 px-5 pb-6 pt-7 sm:px-8">
          <Image src={FESTIVAL_IMAGE} alt="" fill sizes="(max-width: 640px) 100vw, 576px" priority className="z-[-2] object-cover" />
          <div aria-hidden="true" className="absolute inset-0 z-[-1]" style={{ background: 'linear-gradient(100deg, rgba(12, 10, 9, .97) 0%, rgba(12, 10, 9, .81) 48%, rgba(12, 10, 9, .42) 100%)' }} />
          <p className="mb-3 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#ffdf45]"><Ticket className="size-4" aria-hidden="true" /> {ticket.emailStatus === 'preview' ? 'Preview ticket' : 'Personal admission'}</p>
          <h1 id="festival-pass-title" className="max-w-xs text-3xl font-semibold leading-tight tracking-tight sm:text-4xl" style={{ color: '#fff' }}>Africa Future Leaders Festival</h1>
        </header>
        <div className="space-y-5 px-5 py-6 sm:px-8">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-stone-600">Awardee</p>
            <p className="mt-1 break-words text-2xl font-semibold tracking-tight">{interest.fullName}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
            <div className="flex min-w-0 items-start gap-2.5">
              <CalendarDays className="mt-0.5 size-4 shrink-0 text-amber-800" aria-hidden="true" />
              <div className="text-sm leading-5"><p className="font-semibold">{FESTIVAL_DATE}</p><p className="text-stone-600">{FESTIVAL_TIME}</p></div>
            </div>
            <div className="flex min-w-0 items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-amber-800" aria-hidden="true" />
              <div className="text-sm leading-5"><p className="font-semibold">{FESTIVAL_VENUE}</p><p className="text-stone-600">{FESTIVAL_ADDRESS}</p></div>
            </div>
          </div>
        </div>
        <div className="space-y-2 border-t border-dashed border-stone-300 bg-[#fffae8] px-5 py-5 sm:px-8">
          <p className="text-xs font-semibold uppercase tracking-wide text-stone-700">Ticket reference</p>
          <p className="select-all text-base font-semibold tabular-nums [overflow-wrap:anywhere]">{ticket.emailStatus === 'preview' ? `PREVIEW-${ticket.id}` : ticket.id}</p>
          <p className="text-sm text-stone-700">{ticket.emailStatus === 'preview' ? 'This preview is for testing.' : 'Show this ticket and a photo ID at check-in.'}</p>
        </div>
      </article>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <a href={FESTIVAL_DIRECTIONS_URL} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-[#ffdf45] px-4 text-sm font-semibold text-stone-950 hover:bg-[#ffd62b]">Get directions <ArrowUpRight className="size-4" aria-hidden="true" /></a>
        <a href={FESTIVAL_TICKET_PATH} download className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-lg border border-stone-200 bg-white px-4 text-sm font-semibold text-stone-950"><Download className="size-4" aria-hidden="true" /> Download ticket</a>
      </div>
    </div>
  )
}
