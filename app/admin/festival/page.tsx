'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowDown, ArrowUp, ArrowUpRight, ClipboardList, RefreshCw, Ticket, Truck, UserCheck, Users } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { FestivalListActions } from './festival-list-actions'
import { FestivalResponses, type FestivalResponseFilter } from './festival-responses'
import { FestivalDetailGroup, FestivalPagination, FestivalRecord, FestivalStatus, festivalControl } from './festival-list-ui'
import { festivalRequest } from '@/lib/festival/client'
import type { FestivalInterestList, FestivalResponseList } from '@/lib/festival/interest'

const updatedDate = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
})
const lists = [
  { key: 'all', label: 'All responses', icon: ClipboardList },
  { key: 'attending', label: 'Attendees', icon: UserCheck },
  { key: 'guests', label: 'Guests', icon: Users },
  { key: 'dispatch', label: 'Dispatch', icon: Truck },
  { key: 'tickets', label: 'Ticket records', icon: Ticket },
] as const
type ListKey = (typeof lists)[number]['key']
const ticketColumns = ['Awardee name', 'Phone', 'Registration', 'Award preference', 'Ticket reference', 'Last updated (Lagos time)']

function FestivalTickets({ onLoaded }: { onLoaded: (total: number) => void }) {
  const [page, setPage] = useState(1)
  const [view, setView] = useState<FestivalInterestList | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const controller = new AbortController()
    festivalRequest<FestivalInterestList>(`/api/admin/festival-interest?page=${page}`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setError('')
        setView(data)
        onLoaded(data.total)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Ticket records could not be loaded.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [onLoaded, page, retry])

  function reload(nextPage = page) {
    setLoading(true)
    setError('')
    setPage(nextPage)
    setRetry((value) => value + 1)
  }

  return (
    <section aria-labelledby="festival-tickets-heading" className="min-w-0 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 ref={heading} tabIndex={-1} id="festival-tickets-heading" className="scroll-mt-24 text-base font-semibold text-stone-950">Tickets and earlier interest</h2>
        <button type="button" className={festivalControl} disabled={loading} onClick={() => reload()}>
          <RefreshCw className="size-4" aria-hidden="true" /> Refresh
        </button>
      </div>
      <p className="text-sm leading-6 text-stone-700">
        Check payment and fulfillment in <Link href="/admin/awards" className="font-medium underline underline-offset-2">Awards</Link> before confirming collection.
      </p>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">
          <p>{error}</p>
          <button type="button" className={festivalControl} onClick={() => reload()}>Try again</button>
        </div>
      ) : loading || !view ? <p role="status" className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">Loading ticket records…</p>
        : (
          <>
            <p role="status" className="text-sm text-stone-600">{view.total.toLocaleString()} {view.total === 1 ? 'record' : 'records'}</p>
            <FestivalListActions filename="ticket-records" total={view.total} columns={ticketColumns}
              loadPage={async (next) => {
                const result = await festivalRequest<FestivalInterestList>(`/api/admin/festival-interest?page=${next}`)
                return { rows: result.interests, pageSize: result.pageSize, total: result.total }
              }}
              toName={(item) => item.fullName}
              toCsv={(item) => [
                item.fullName, item.phone, item.ticketId ? 'Ticket issued' : 'Earlier interest',
                item.pickupRequested ? 'Festival pickup' : 'Dispatch', item.ticketId ?? '',
                updatedDate.format(new Date(item.updatedAt)),
              ]}
            />
            {view.interests.length ? (
              <ul aria-label="Festival ticket records" className="space-y-2">
                {view.interests.map((item, index) => (
                  <FestivalRecord
                    key={item.memberId}
                    name={item.fullName}
                    number={(page - 1) * view.pageSize + index + 1}
                    attendance={<FestivalStatus tone={item.ticketId ? 'good' : 'pending'}>{item.ticketId ? 'Ticket issued' : 'Earlier interest'}</FestivalStatus>}
                    fulfillment={<FestivalStatus>{item.pickupRequested ? 'Festival pickup' : 'Dispatch requested'}</FestivalStatus>}
                  >
                    <FestivalDetailGroup label="Awardee phone">
                      <a href={`tel:${item.phone}`} className="underline underline-offset-2">{item.phone}</a>
                    </FestivalDetailGroup>
                    <FestivalDetailGroup label="Ticket reference">
                      <p>{item.ticketId ?? 'Registration required'}</p>
                    </FestivalDetailGroup>
                    <FestivalDetailGroup label="Last updated · Lagos time">
                      <p>{updatedDate.format(new Date(item.updatedAt))}</p>
                    </FestivalDetailGroup>
                  </FestivalRecord>
                ))}
              </ul>
            ) : <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">No ticket records on this page.</p>}
            <FestivalPagination page={page} pageSize={view.pageSize} total={view.total} onPage={(nextPage) => {
              reload(nextPage)
              heading.current?.focus({ preventScroll: true })
              heading.current?.scrollIntoView({ block: 'start' })
            }} />
          </>
        )}
    </section>
  )
}

export default function FestivalAdminPage() {
  const [active, setActive] = useState<ListKey | null>(null)
  const [counts, setCounts] = useState<Partial<Record<ListKey, number>>>({})
  const list = useRef<HTMLDivElement>(null)
  const updateResponses = useCallback((filter: FestivalResponseFilter, data: FestivalResponseList) => {
    setCounts((prior) => ({
      ...prior, [filter]: data.total, attending: data.attending, guests: data.guests, dispatch: data.dispatch,
    }))
  }, [])
  const updateTickets = useCallback((total: number) => {
    setCounts((prior) => ({ ...prior, tickets: total }))
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    festivalRequest<FestivalResponseList>('/api/admin/festival-rsvps', { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) updateResponses('all', data) })
      .catch(() => { /* Opening a list retries its own request. */ })
    festivalRequest<FestivalInterestList>('/api/admin/festival-interest', { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) updateTickets(data.total) })
      .catch(() => { /* Opening a list retries its own request. */ })
    return () => controller.abort()
  }, [updateResponses, updateTickets])

  useEffect(() => {
    if (!active) return
    list.current?.focus({ preventScroll: true })
    list.current?.scrollIntoView({ block: 'start' })
  }, [active])

  return (
    <div id="festival-lists" className="min-w-0 scroll-mt-24 space-y-4 pb-6 sm:space-y-5">
      <PageHeader eyebrow="Africa Future Leaders Festival 2026" title="Festival responses" />
      <Link href="/admin/festival/fulfillment" className="flex min-w-0 items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-stone-950 hover:border-amber-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700">
        <ClipboardList className="size-5 shrink-0 text-amber-800" aria-hidden="true" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Award fulfillment roster</span>
          <span className="block text-sm leading-5 text-stone-700">Festival pickup, paid dispatch and delivery payments due</span>
        </span>
        <ArrowUpRight className="size-4 shrink-0" aria-hidden="true" />
      </Link>
      <div role="group" aria-label="Open a festival list" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
        {lists.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" aria-pressed={active === key} onClick={() => {
            if (active === key) list.current?.scrollIntoView({ block: 'start' })
            else setActive(key)
          }}
            className="group min-h-24 min-w-0 rounded-xl border border-stone-200 bg-white p-3.5 text-left hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 aria-pressed:border-amber-600 aria-pressed:bg-amber-50 first:col-span-2 sm:first:col-span-1">
            <span className="flex min-w-0 items-center justify-between gap-1 text-stone-600">
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <ArrowDown className="size-4 shrink-0" aria-hidden="true" />
            </span>
            <span className="mt-2.5 flex min-w-0 items-end justify-between gap-2">
              <span className="text-sm font-semibold leading-tight text-stone-950">{label}</span>
              <span className="text-lg font-semibold leading-none tabular-nums text-stone-950">{counts[key]?.toLocaleString() ?? '—'}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <Link href="/dashboard/festival/rsvp" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-stone-700 underline underline-offset-2">RSVP form <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
        <Link href="/dashboard/festival/dispatch" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-stone-700 underline underline-offset-2">Dispatch form <ArrowUpRight className="size-3.5" aria-hidden="true" /></Link>
      </div>
      {active && (
        <div ref={list} tabIndex={-1} aria-label={lists.find(({ key }) => key === active)?.label} className="min-w-0 scroll-mt-20 space-y-2 border-t border-stone-200 pt-2">
          <a href="#festival-lists" className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-stone-700 underline underline-offset-2"><ArrowUp className="size-3.5" aria-hidden="true" /> All lists</a>
          {active === 'tickets' ? <FestivalTickets onLoaded={updateTickets} />
            : <FestivalResponses key={active} filter={active} onLoaded={updateResponses} />}
        </div>
      )}
    </div>
  )
}
