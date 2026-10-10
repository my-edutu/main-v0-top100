'use client'

import { useEffect, useState } from 'react'
import { ArrowUpRight, CalendarDays, CalendarPlus } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AFL_2026_CALENDAR, AFL_2026_CALENDAR_POPUP_END, isAflCalendarPopupDay } from '@/lib/events/afl-2026-calendar'
import { dashboardCelebrationStorageKey } from '@/lib/dashboard/celebration'

export function AflCalendarAnnouncement({ memberId, dashboardLoginCount }: { memberId: string; dashboardLoginCount: number }) {
  const [open, setOpen] = useState(false)
  const storageKey = `afl:calendar-announcement-seen:${AFL_2026_CALENDAR.campaignId}:${memberId}`

  useEffect(() => {
    if (!isAflCalendarPopupDay(Date.now())) return

    const showIfReady = () => {
      try {
        if (window.localStorage.getItem(storageKey) === 'true') return
        if (dashboardLoginCount === 1 && window.localStorage.getItem(dashboardCelebrationStorageKey(memberId)) !== 'true') return
      } catch {
        // Keep the announcement available if browser storage is disabled.
      }
      setOpen(true)
    }

    showIfReady()
    window.addEventListener('afl:dashboard-celebration-dismissed', showIfReady)
    const expiry = window.setTimeout(() => setOpen(false), AFL_2026_CALENDAR_POPUP_END - Date.now())
    return () => {
      window.removeEventListener('afl:dashboard-celebration-dismissed', showIfReady)
      window.clearTimeout(expiry)
    }
  }, [dashboardLoginCount, memberId, storageKey])

  const dismiss = () => {
    setOpen(false)
    try { window.localStorage.setItem(storageKey, 'true') } catch { /* Dismiss for this visit. */ }
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) dismiss() }}>
      <DialogContent className="max-h-[90dvh] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-[22px] border-[#E9D6C5] bg-white p-5 shadow-2xl sm:p-7" overlayClassName="bg-[#110D0A]/75 backdrop-blur-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF1D8] text-[#A6440D]"><CalendarDays className="h-6 w-6" aria-hidden="true" /></div>
        <DialogHeader className="text-left">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#A6440D]">Your 2026 programme</p>
          <DialogTitle className="text-2xl font-semibold leading-tight tracking-tight text-[#171412]">The event calendar is ready</DialogTitle>
          <DialogDescription className="pt-1 text-sm leading-6 text-[#625B52]">View the full Africa Future Leaders schedule, or add it to Google Calendar to see the dates alongside your own. You can choose your own reminder settings there.</DialogDescription>
        </DialogHeader>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row">
          <a href={AFL_2026_CALENDAR.addUrl} target="_blank" rel="noopener noreferrer" onClick={dismiss} className="inline-flex min-h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-[#F36D21] px-4 text-sm font-semibold text-white hover:bg-[#D65412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2"><CalendarPlus className="h-4 w-4" aria-hidden="true" />Add to Google Calendar</a>
          <a href={AFL_2026_CALENDAR.viewUrl} target="_blank" rel="noopener noreferrer" onClick={dismiss} className="inline-flex min-h-12 items-center justify-center gap-1.5 rounded-xl border border-[#E9D6C5] px-4 text-sm font-semibold text-[#84330B] hover:bg-[#FFF7EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-700 focus-visible:ring-offset-2">View schedule<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
