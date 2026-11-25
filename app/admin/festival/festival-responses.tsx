'use client'

import { useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { festivalRequest } from '@/lib/festival/client'
import type { FestivalAdminResponse, FestivalResponseList } from '@/lib/festival/interest'
import { FestivalListActions } from './festival-list-actions'
import { FestivalDetailGroup, FestivalPagination, FestivalRecord, FestivalStatus, festivalControl } from './festival-list-ui'

export type FestivalResponseFilter = 'all' | 'attending' | 'guests' | 'dispatch'

const headings: Record<FestivalResponseFilter, string> = {
  all: 'All awardee responses',
  attending: 'Attending awardees',
  guests: 'Guest list',
  dispatch: 'Dispatch requests',
}

const columns = [
  'Awardee name', 'Awardee email', 'Awardee phone', 'Attendance', 'Award preference',
  'Guest name', 'Guest email', 'Guest phone', 'Dispatch recipient', 'Dispatch phone',
  'Street address', 'City', 'Region', 'Postal code', 'Country',
]

function awardeeName(item: FestivalAdminResponse) {
  return item.awardee?.name ?? item.name
}

function toCsv(item: FestivalAdminResponse) {
  const { awardee, attending, dispatch, guest, pickup } = item
  return [
    awardeeName(item), awardee?.email || item.email, awardee?.phone ?? '',
    attending === null ? 'Pending' : attending ? 'Attending' : 'Not attending',
    pickup === 'festival' ? 'Festival pickup' : 'Dispatch',
    guest?.name ?? '', guest?.email ?? '', guest?.phone ?? '',
    dispatch?.recipient ?? '', dispatch?.phone ?? '', dispatch?.address ?? '', dispatch?.city ?? '',
    dispatch?.region ?? '', dispatch?.postalCode ?? '', dispatch?.country ?? '',
  ]
}

function ResponseRecord({ item, number }: { item: FestivalAdminResponse; number: number }) {
  const email = item.awardee?.email || item.email
  const isPickup = item.pickup === 'festival'
  return (
    <FestivalRecord
      number={number}
      name={awardeeName(item)}
      attendance={
        <>
          <FestivalStatus tone={item.attending === true ? 'good' : 'neutral'}>
            {item.attending === null ? 'Attendance pending' : item.attending ? 'Attending' : 'Not attending'}
          </FestivalStatus>
          {item.guest && <FestivalStatus>+1 guest</FestivalStatus>}
        </>
      }
      fulfillment={
        <FestivalStatus tone={isPickup || item.dispatch ? 'neutral' : 'pending'}>
          {isPickup ? 'Festival pickup' : item.dispatch ? 'Dispatch details received' : 'Dispatch details pending'}
        </FestivalStatus>
      }
    >
      <FestivalDetailGroup label="Awardee contact">
        {email ? <a className="block underline underline-offset-2" href={`mailto:${encodeURIComponent(email)}`}>{email}</a> : <p>Email unavailable</p>}
        {item.awardee?.phone
          ? <a className="block underline underline-offset-2" href={`tel:${item.awardee.phone}`}>{item.awardee.phone}</a>
          : <p>RSVP phone unavailable</p>}
      </FestivalDetailGroup>
      <FestivalDetailGroup label="Guest">
        {item.guest ? (
          <>
            <p className="font-medium text-stone-950">{item.guest.name}</p>
            {item.guest.email ? <a className="block underline underline-offset-2" href={`mailto:${encodeURIComponent(item.guest.email)}`}>{item.guest.email}</a> : <p>Email unavailable</p>}
            {item.guest.phone ? <a className="block underline underline-offset-2" href={`tel:${item.guest.phone}`}>{item.guest.phone}</a> : <p>Phone unavailable</p>}
          </>
        ) : <p>{item.attending === false || item.awardee ? 'No guest' : 'Guest details not recorded'}</p>}
      </FestivalDetailGroup>
      {item.dispatch && (
        <FestivalDetailGroup label="Shipping address">
          <p className="font-medium text-stone-950">{item.dispatch.recipient}</p>
          <a className="block underline underline-offset-2" href={`tel:${item.dispatch.phone}`}>{item.dispatch.phone}</a>
          <p>{[item.dispatch.address, item.dispatch.city, item.dispatch.region, item.dispatch.postalCode, item.dispatch.country].filter(Boolean).join(', ')}</p>
        </FestivalDetailGroup>
      )}
    </FestivalRecord>
  )
}

export function FestivalResponses({ filter, onLoaded }: {
  filter: FestivalResponseFilter
  onLoaded: (filter: FestivalResponseFilter, counts: FestivalResponseList) => void
}) {
  const [page, setPage] = useState(1)
  const [view, setView] = useState<FestivalResponseList | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [reload, setReload] = useState(0)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    const controller = new AbortController()
    festivalRequest<FestivalResponseList>(`/api/admin/festival-rsvps?filter=${filter}&page=${page}`, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setView(data)
        onLoaded(filter, data)
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Responses could not be loaded.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [filter, onLoaded, page, reload])

  function navigate(nextPage: number) {
    setError('')
    setLoading(true)
    setPage(nextPage)
    setReload((value) => value + 1)
  }

  return (
    <section aria-labelledby="festival-rsvps-heading" className="min-w-0 space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 ref={heading} tabIndex={-1} id="festival-rsvps-heading" className="scroll-mt-24 text-base font-semibold text-stone-950">{headings[filter]}</h2>
        <button type="button" className={festivalControl} onClick={() => navigate(page)} disabled={loading}>
          <RefreshCw className="size-4" aria-hidden="true" /> Refresh
        </button>
      </div>
      {error ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border border-rose-200 bg-white p-4 text-sm text-rose-800">
          <p>{error}</p>
          <button type="button" className={festivalControl} onClick={() => navigate(page)}>Try again</button>
        </div>
      ) : loading || !view ? <p role="status" className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-600">Loading responses…</p>
        : (
          <>
            <p role="status" className="text-sm text-stone-600">{view.total.toLocaleString()} {view.total === 1 ? 'record' : 'records'}</p>
            <FestivalListActions filename={filter} total={view.total} columns={columns}
              loadPage={async (next) => {
                const result = await festivalRequest<FestivalResponseList>(`/api/admin/festival-rsvps?filter=${filter}&page=${next}`)
                return { rows: result.responses, pageSize: result.pageSize, total: result.total }
              }}
              toCsv={toCsv}
              toName={(item) => filter === 'guests' ? (item.guest?.name ?? '') : awardeeName(item)}
            />
            {view.responses.length ? (
              <ul aria-label="Awardee responses" className="space-y-2">
                {view.responses.map((item, index) => <ResponseRecord item={item} key={item.memberId} number={(page - 1) * view.pageSize + index + 1} />)}
              </ul>
            ) : <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">No responses match this filter.</p>}
            <FestivalPagination page={page} pageSize={view.pageSize} total={view.total} onPage={(nextPage) => {
              navigate(nextPage)
              heading.current?.focus({ preventScroll: true })
              heading.current?.scrollIntoView({ block: 'start' })
            }} />
          </>
        )}
    </section>
  )
}
