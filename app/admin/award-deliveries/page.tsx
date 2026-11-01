'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, PackageCheck, RefreshCw, Truck } from 'lucide-react'

import PageHeader from '../components/PageHeader'
import type { AdminDeliveryOrderView, DeliveryOrderStatus, DeliveryOrderView } from '@/lib/awards/delivery/types'
import { deliveryRecoveryWaybill, deliveryReviewReason } from '@/lib/awards/delivery/admin-ui'
import { deliveryDestinationLabel, formatDeliveryAmount } from '@/lib/awards/delivery/member-ui'

type AdminDelivery = AdminDeliveryOrderView

function statusLabel(status: DeliveryOrderStatus) {
  return {
    quoted: 'Quoted',
    creating: 'Preparing payment',
    open: 'Payment open',
    paid: 'Paid · booking pending',
    booking: 'Booking',
    dispatched: 'Dispatched',
    expired: 'Expired',
    needs_review: 'Needs review',
  }[status]
}

function statusClasses(status: DeliveryOrderStatus) {
  if (status === 'needs_review') return 'border-rose-200 bg-rose-50 text-rose-800'
  if (status === 'paid' || status === 'booking') return 'border-amber-200 bg-amber-50 text-amber-900'
  if (status === 'dispatched') return 'border-emerald-200 bg-emerald-50 text-emerald-800'
  return 'border-stone-200 bg-stone-50 text-stone-700'
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : '—'
}

function destination(delivery: DeliveryOrderView) {
  return deliveryDestinationLabel(delivery) || 'Destination not recorded'
}

export default function AdminAwardDeliveriesPage() {
  const [deliveries, setDeliveries] = useState<AdminDelivery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/award-deliveries', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(typeof body?.message === 'string' ? body.message : 'Could not load delivery orders.')
      if (!Array.isArray(body?.deliveries)) throw new Error('The delivery API returned an invalid list.')
      setDeliveries(body.deliveries as AdminDelivery[])
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load delivery orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void load() }, 0)
    return () => window.clearTimeout(timer)
  }, [load])

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Awards & delivery"
        title="Award deliveries"
        description="Review separate delivery payments and booking exceptions. Payment and dispatch actions remain server-controlled."
        actions={<button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#d9d4cc] bg-white px-4 text-sm font-medium text-zinc-800 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60">{loading ? <RefreshCw className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}Refresh</button>}
      />

      {error ? <section role="alert" className="admin-panel flex items-start gap-3 border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900"><AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" /><div><h2 className="font-semibold">Could not load delivery orders</h2><p className="mt-1">{error}</p><button type="button" onClick={() => void load()} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg border border-rose-300 bg-white px-3 font-medium text-rose-900">Try again</button></div></section> : null}

      {loading && deliveries.length === 0 ? <section aria-label="Loading delivery orders" className="admin-panel space-y-3 p-5"><div className="h-5 w-48 animate-pulse rounded bg-stone-200" /><div className="h-4 w-full animate-pulse rounded bg-stone-100" /><div className="h-20 w-full animate-pulse rounded bg-stone-100" /></section> : null}

      {!loading && !error && deliveries.length === 0 ? <section className="admin-panel p-8 text-center"><Truck className="mx-auto size-8 text-stone-400" aria-hidden="true" /><h2 className="mt-3 text-lg font-semibold text-zinc-900">No separate delivery orders</h2><p className="mt-1 text-sm leading-6 text-zinc-500">New member delivery quotes and payment exceptions will appear here.</p></section> : null}

      {deliveries.length > 0 ? <section aria-labelledby="delivery-queue-title" className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2"><div><p className="admin-kicker">Separate delivery ledger</p><h2 id="delivery-queue-title" className="text-xl font-semibold tracking-tight text-zinc-950">Latest delivery orders</h2></div><p className="text-sm text-zinc-500">{deliveries.length} shown</p></div>
        <div className="space-y-3">
          {deliveries.map(delivery => <article key={delivery.id} className="admin-panel min-w-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3"><span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${delivery.status === 'dispatched' ? 'bg-emerald-100 text-emerald-800' : delivery.status === 'needs_review' ? 'bg-rose-100 text-rose-800' : 'bg-orange-100 text-orange-800'}`}>{delivery.status === 'dispatched' ? <PackageCheck className="size-5" aria-hidden="true" /> : <Truck className="size-5" aria-hidden="true" />}</span><div className="min-w-0"><h3 className="break-words text-base font-semibold text-zinc-950">{delivery.recipientName || 'Recipient not recorded'}</h3><p className="mt-1 break-all text-xs text-zinc-500">Reference {delivery.id} · member {delivery.memberId}</p></div></div>
              <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium ${statusClasses(delivery.status)}`}>{statusLabel(delivery.status)}</span>
            </div>
            <div className="mt-4 grid min-w-0 gap-4 border-t border-stone-100 pt-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0"><p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">Destination</p><p className="mt-1 break-words text-sm leading-6 text-zinc-800">{destination(delivery)}</p><p className="mt-1 text-xs text-zinc-500">{delivery.deliveryMode === 'service_centre' ? 'GIG centre collection' : 'Home delivery'} · {delivery.phone}</p></div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:min-w-[220px] sm:grid-cols-1"><div className="flex justify-between gap-5 sm:justify-start sm:gap-3"><dt className="text-zinc-500">Delivery fee</dt><dd className="font-medium tabular-nums text-zinc-900">{formatDeliveryAmount(delivery.amountMinor, delivery.currency)}</dd></div><div className="flex justify-between gap-5 sm:justify-start sm:gap-3"><dt className="text-zinc-500">Paid</dt><dd className="text-zinc-800">{formatDate(delivery.paidAt)}</dd></div><div className="flex justify-between gap-5 sm:justify-start sm:gap-3"><dt className="text-zinc-500">Waybill</dt><dd className="break-all text-right text-zinc-800 sm:text-left">{delivery.waybill || 'Pending'}</dd></div></dl>
            </div>
            {delivery.status === 'needs_review' ? <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-950">
              <p className="text-xs font-medium uppercase tracking-[0.12em] text-rose-800">Reconciliation details</p>
              {deliveryReviewReason(delivery) ? <p className="mt-2 break-words"><span className="font-medium">Reason:</span> {deliveryReviewReason(delivery)}</p> : null}
              {deliveryRecoveryWaybill(delivery) ? <p className="mt-1 break-words"><span className="font-medium">Known carrier waybill:</span> {deliveryRecoveryWaybill(delivery)}</p> : null}
              {!deliveryReviewReason(delivery) && !deliveryRecoveryWaybill(delivery) ? <p className="mt-2">No automated recovery details were recorded. Review the provider and carrier records before taking action.</p> : null}
            </div> : null}
          </article>)}
        </div>
      </section> : null}
    </div>
  )
}
