'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertCircle, Clock3, PackageCheck, RefreshCw, Search, Truck, UserCheck } from 'lucide-react'
import { festivalRequest } from '@/lib/festival/client'
import { fulfillmentQueues, type FulfillmentQueue, type FulfillmentRecord, type FulfillmentRoster } from '@/lib/festival/fulfillment'
import PageHeader from '../../components/PageHeader'
import { FestivalListActions } from '../festival-list-actions'
import { FestivalDetailGroup, FestivalPagination, FestivalRecord, FestivalStatus, festivalControl } from '../festival-list-ui'

const queues = {
  pickup: { label: 'Festival pickup', description: 'Paid awardees and named collectors', icon: UserCheck },
  'dispatch-paid': { label: 'Dispatch paid', description: 'Delivery payment verified', icon: PackageCheck },
  'dispatch-pending': { label: 'Dispatch payment pending', description: 'Delivery details, quote or payment due', icon: Truck },
  review: { label: 'Needs review', description: 'Missing choices and records to check', icon: AlertCircle },
} satisfies Record<FulfillmentQueue, { label: string; description: string; icon: typeof UserCheck }>

const timestamp = new Intl.DateTimeFormat('en-NG', {
  dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos',
})
const naira = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })
function formatCharge(charge: NonNullable<FulfillmentRecord['shippingCharge']>) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: charge.currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(charge.amount))
}

const pageSize = 25
const columns = [
  'Awardee', 'Awardee email', 'Awardee phone', 'List', 'Status', 'Award fee verified at (WAT)',
  'Delivery payment verified at (WAT)', 'Named collector', 'Collector phone', 'Delivery recipient',
  'Recipient phone', 'Delivery destination', 'Delivery fee (NGN)', 'Bachs charge amount', 'Bachs charge currency',
  'Waybill', 'Award order',
  'Festival ticket', 'Roster checked at (WAT)',
]

export default function FestivalFulfillmentPage() {
  const [view, setView] = useState<FulfillmentRoster | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [active, setActive] = useState<FulfillmentQueue>('pickup')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const controller = new AbortController()
    festivalRequest<FulfillmentRoster>('/api/admin/festival-fulfillment', { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setView(data) })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'The roster could not be loaded.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [refresh])

  function reload() {
    setView(null)
    setLoading(true)
    setError('')
    setPage(1)
    setRefresh((value) => value + 1)
  }

  const selected = view?.records.filter((record) => record.queue === active) ?? []
  const query = search.trim().toLowerCase()
  const rows = selected.filter((row) => [
    row.name, row.email, row.phone, row.collectorName, row.recipientName, row.destination, row.orderId, row.waybill,
  ].some((value) => value?.toLowerCase().includes(query)))
  const first = (page - 1) * pageSize
  const displayTime = view ? timestamp.format(new Date(view.checkedAt)) : ''

  return (
    <div className="min-w-0 space-y-5 pb-6">
      <PageHeader
        backHref="/admin/festival" backLabel="Festival responses"
        eyebrow="Africa Future Leaders Festival 2026" title="Award fulfillment"
        actions={<button type="button" onClick={reload} disabled={loading} className={festivalControl}>
          <RefreshCw className="size-4" aria-hidden="true" /> Refresh roster
        </button>}
      />

      {loading && <p role="status" className="rounded-xl border border-stone-200 bg-white p-5 text-sm">Checking award payments and festival responses…</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-white p-5 text-sm text-rose-800">{error}</p>}
      {view && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-sm text-stone-700">
            <p><strong className="font-semibold text-stone-950">{view.awardPaid.toLocaleString()}</strong> awardees with verified award payments</p>
            <p className="inline-flex items-center gap-1.5"><Clock3 className="size-4 shrink-0" aria-hidden="true" /> Checked {displayTime} WAT</p>
          </div>

          {view.unmatchedReceipts > 0 && (
            <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
              {view.unmatchedReceipts} Bachs delivery {view.unmatchedReceipts === 1 ? 'receipt needs' : 'receipts need'} matching.
              Check <Link href="/admin/award-deliveries" className="font-semibold underline underline-offset-2">Award deliveries</Link> before requesting payment again.
            </p>
          )}

          <div role="group" aria-label="Fulfillment lists" className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {fulfillmentQueues.map((key) => {
              const { label, description, icon: Icon } = queues[key]
              return (
                <button key={key} type="button" aria-pressed={active === key} aria-controls="fulfillment-list"
                  onClick={() => { setActive(key); setSearch(''); setPage(1) }}
                  className="min-w-0 rounded-xl border border-stone-200 bg-white p-3 text-left hover:border-stone-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700 aria-pressed:border-amber-600 aria-pressed:bg-amber-50 sm:p-4">
                  <span className="flex items-center justify-between gap-2">
                    <Icon className="size-5 text-stone-600" aria-hidden="true" />
                    <span className="text-xl font-semibold tabular-nums text-stone-950">{view.records.filter((record) => record.queue === key).length}</span>
                  </span>
                  <span className="mt-3 block text-sm font-semibold leading-tight text-stone-950">{label}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-stone-600">{description}</span>
                </button>
              )
            })}
          </div>

          <section id="fulfillment-list" aria-labelledby="fulfillment-list-title" className="min-w-0 space-y-3">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="fulfillment-list-title" className="text-lg font-semibold text-stone-950">{queues[active].label}</h2>
              <p role="status" className="text-sm tabular-nums text-stone-600">
                {query ? `${rows.length} of ${selected.length}` : selected.length} {selected.length === 1 ? 'awardee' : 'awardees'}
              </p>
            </div>
            {active === 'review' && <p className="text-sm leading-6 text-stone-700">Resolve each record’s status before releasing the award.</p>}
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start">
              <label className="flex min-h-11 min-w-0 items-center gap-2 rounded-lg border border-stone-200 bg-white px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-orange-700 sm:flex-1">
                <Search className="size-4 shrink-0 text-stone-500" aria-hidden="true" />
                <span className="sr-only">Search this list</span>
                <input type="search" placeholder="Search name, destination or waybill" value={search}
                  onChange={(event) => { setSearch(event.target.value); setPage(1) }}
                  className="min-h-11 min-w-0 w-full bg-transparent text-sm text-stone-950 outline-none" />
              </label>
              <FestivalListActions key={`${active}:${query}:${view.checkedAt}`} filename={active} total={rows.length} columns={columns}
                loadPage={async (next) => ({ rows: rows.slice((next - 1) * pageSize, next * pageSize), pageSize, total: rows.length })}
                toName={(record) => record.collectorName ? `${record.name} (collector: ${record.collectorName})` : record.name}
                toCsv={(record) => [
                  record.name, record.email, record.phone, queues[record.queue].label, record.status,
                  record.awardPaidAt ? timestamp.format(new Date(record.awardPaidAt)) : '',
                  record.shippingPaidAt ? timestamp.format(new Date(record.shippingPaidAt)) : '',
                  record.collectorName, record.collectorPhone, record.recipientName, record.recipientPhone,
                  record.destination, record.shippingAmountMinor === null ? '' : (record.shippingAmountMinor / 100).toFixed(2),
                  record.shippingCharge?.amount ?? '', record.shippingCharge?.currency ?? '',
                  record.waybill ?? '', record.orderId ?? '', record.ticketId ?? '', displayTime,
                ]} />
            </div>

            {rows.length === 0 ? (
              <p className="rounded-xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
                {query ? 'No awardees match this search.' : 'There are no awardees in this list.'}
              </p>
            ) : (
              <ol aria-label={queues[active].label} className="space-y-2">
                {rows.slice(first, first + pageSize).map((row, index) => (
                  <FestivalRecord key={row.memberId} name={row.name} number={first + index + 1}
                    summary={active === 'dispatch-paid' && (
                      <>
                        <span className="block">{row.destination || 'Destination unavailable'}</span>
                        {row.shippingAmountMinor !== null && <span className="block">Delivery fee {naira.format(row.shippingAmountMinor / 100)}</span>}
                        {row.shippingCharge && <span className="block">Bachs charged {formatCharge(row.shippingCharge)}</span>}
                      </>
                    )}
                    attendance={<FestivalStatus tone={row.awardPaidAt ? 'good' : 'pending'}>
                      {row.awardPaidAt ? 'Award fee verified' : 'Award fee unconfirmed'}
                    </FestivalStatus>}
                    fulfillment={<FestivalStatus tone={active === 'review' || active === 'dispatch-pending' ? 'pending' : 'neutral'}>{row.status}</FestivalStatus>}>
                    <FestivalDetailGroup label="Awardee contact">
                      {row.email && <p>{row.email}</p>}
                      {row.phone && <a href={`tel:${row.phone}`} className="underline underline-offset-2">{row.phone}</a>}
                      {!row.email && !row.phone && <p>Contact details unavailable</p>}
                    </FestivalDetailGroup>
                    {row.collectorName && <FestivalDetailGroup label="Named collector">
                      <p>{row.collectorName}</p>
                      {row.collectorPhone && <a href={`tel:${row.collectorPhone}`} className="underline underline-offset-2">{row.collectorPhone}</a>}
                    </FestivalDetailGroup>}
                    {(row.queue.startsWith('dispatch') || row.recipientName || row.destination || row.waybill) && (
                      <FestivalDetailGroup label="Delivery">
                        {row.recipientName && <p>{row.recipientName}</p>}
                        {row.recipientPhone && <p>{row.recipientPhone}</p>}
                        <p>{row.destination || 'Destination unavailable'}</p>
                        {row.shippingAmountMinor !== null && <p>Delivery fee {naira.format(row.shippingAmountMinor / 100)}</p>}
                        {row.shippingCharge && <p>Bachs charged {formatCharge(row.shippingCharge)}</p>}
                        {row.waybill && <p>Waybill {row.waybill}</p>}
                        {row.shippingPaidAt && <p>Paid {timestamp.format(new Date(row.shippingPaidAt))} WAT</p>}
                      </FestivalDetailGroup>
                    )}
                    <FestivalDetailGroup label="References">
                      {row.orderId && <p>Order {row.orderId}</p>}
                      {row.ticketId && <p>Ticket {row.ticketId}</p>}
                      {row.awardPaidAt && <p>Paid {timestamp.format(new Date(row.awardPaidAt))} WAT</p>}
                      {!row.orderId && !row.ticketId && <p>Order and ticket unavailable</p>}
                    </FestivalDetailGroup>
                  </FestivalRecord>
                ))}
              </ol>
            )}
            <FestivalPagination page={page} pageSize={pageSize} total={rows.length} onPage={setPage} />
          </section>
        </>
      )}
    </div>
  )
}
