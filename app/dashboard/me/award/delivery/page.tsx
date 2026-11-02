'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Truck,
} from 'lucide-react'

import { AwardRouteLoading } from '../../../awards-section'
import { paymentIsConfirmed } from '../../../award-payment-view'
import { useDashboardMember } from '../../../_providers/dashboard-member'
import { DeliveryCostChecker } from '../../../_components/delivery-cost-checker'
import { DeliveryPhone } from '../../../_components/delivery-phone'
import type { AwardPaymentView } from '@/lib/awards/payment'
import type { DeliveryPreviewQuote } from '@/lib/awards/delivery-preview'
import type { DeliveryOrderStatus, DeliveryOrderView, IncludedDeliveryView } from '@/lib/awards/delivery/types'
import { BACHS_DELIVERY_PAYMENT_LINK } from '@/lib/payments/bachs/payment-links'
import {
  awardDeliveryBill,
  canEditDelivery,
  canPayDelivery,
  canResumeDelivery,
  deliveryCheckoutBody,
  deliveryDestinationLabel,
  deliveryPaymentWarning,
  deliveryReconcileRequest,
  deliveryQuoteExpired,
  formatDeliveryAmount,
  isHostedCheckoutUrl,
  parseIncludedDelivery,
  shouldReconcileDeliveryReturn,
  shouldShowIncludedDelivery,
} from '@/lib/awards/delivery/member-ui'

type DeliveryResponse = { delivery: DeliveryOrderView | null; includedDelivery?: IncludedDeliveryView | null }

const LOCKED_STATUSES: DeliveryOrderStatus[] = ['creating', 'open', 'paid', 'booking', 'dispatched', 'needs_review']

function readMessage(body: unknown, fallback: string) {
  if (body && typeof body === 'object' && typeof (body as { message?: unknown }).message === 'string') {
    return (body as { message: string }).message
  }
  return fallback
}
function formatDateTime(value: string) {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function statusLabel(status: DeliveryOrderStatus, expired: boolean) {
  if (status === 'quoted' && expired) return 'Quote expired'
  return {
    quoted: 'Quote ready',
    creating: 'Preparing payment',
    open: 'Payment not yet confirmed',
    paid: 'Payment received',
    booking: 'Booking delivery',
    dispatched: 'Dispatched',
    expired: 'Quote expired',
    needs_review: 'Needs review',
  }[status]
}

function statusClasses(status: DeliveryOrderStatus, expired: boolean) {
  if ((status === 'quoted' && !expired) || status === 'dispatched') return 'border-emerald-200 bg-emerald-50 text-emerald-900'
  if (status === 'needs_review') return 'border-rose-200 bg-rose-50 text-rose-900'
  if (status === 'expired' || expired) return 'border-amber-200 bg-amber-50 text-amber-950'
  return 'border-stone-200 bg-stone-50 text-stone-800'
}

function DeliveryFeeSummary({ payment, delivery, deliveryAlreadyIncluded = false }: { payment: AwardPaymentView; delivery: DeliveryOrderView | null; deliveryAlreadyIncluded?: boolean }) {
  const bill = awardDeliveryBill(payment.confirmedPayment, delivery)
  if (!bill.award) return null
  return (
    <section aria-labelledby="delivery-bill-title" className="rounded-[18px] border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.15em] text-stone-500">Your award bill</p>
          <h2 id="delivery-bill-title" className="mt-1 text-lg font-semibold tracking-tight text-[#171412]">Award fee confirmed</h2>
        </div>
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" aria-hidden="true" />
      </div>
      <dl className="mt-5 divide-y divide-stone-100 text-sm">
        <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
          <dt className="text-stone-600">{bill.award.label}</dt>
          <dd className="font-medium tabular-nums text-[#171412]">{formatDeliveryAmount(bill.award.amountMinor, bill.award.currency)}</dd>
        </div>
        {bill.delivery ? <div className="flex items-center justify-between gap-4 py-3 last:pb-0">
          <dt className="text-stone-600">{bill.delivery.label}</dt>
          <dd className="font-medium tabular-nums text-[#171412]">{formatDeliveryAmount(bill.delivery.amountMinor, bill.delivery.currency)}</dd>
        </div> : null}
      </dl>
      <p className="mt-4 text-xs leading-5 text-stone-500">{deliveryAlreadyIncluded ? 'Delivery was included in your previous award payment. No separate delivery charge is due.' : 'Delivery is a separate charge. Your confirmed award fee is not charged again.'}</p>
    </section>
  )
}

function IncludedDeliveryPanel({ delivery }: { delivery: IncludedDeliveryView }) {
  const hasRecoveryDetails = Boolean(delivery.waybill || delivery.trackingUrl)
  return (
    <section aria-labelledby="included-delivery-title" className="rounded-[18px] border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 text-emerald-700">
          <PackageCheck className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-emerald-800">Delivery included</p>
          <h2 id="included-delivery-title" className="mt-1 text-xl font-semibold tracking-tight text-emerald-950">Delivery is already included</h2>
          <p className="mt-2 text-sm leading-6 text-emerald-950">Your previous award payment covered delivery, so there is no separate delivery charge to pay.</p>
        </div>
      </div>
      {delivery.waybill ? <p className="mt-5 border-t border-emerald-200 pt-4 text-sm leading-6 text-emerald-950"><span className="font-medium">Waybill:</span> <span className="break-all">{delivery.waybill}</span></p> : null}
      {delivery.trackingUrl ? <a href={delivery.trackingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 text-sm font-medium text-emerald-950 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700">Track delivery <ExternalLink className="h-4 w-4" aria-hidden="true" /></a> : null}
      {!hasRecoveryDetails ? <p className="mt-5 border-t border-emerald-200 pt-4 text-sm leading-6 text-emerald-950">Our team will confirm the delivery arrangements for this award. <a href="mailto:info@top100afl.com?subject=Award%20delivery%20arrangements" className="font-medium underline underline-offset-4">Contact the delivery team</a>.</p> : null}
    </section>
  )
}
function QuoteExpiry({ delivery, now }: { delivery: DeliveryOrderView; now: number }) {
  const expired = delivery.status === 'expired' || deliveryQuoteExpired(delivery, now)
  return (
    <p className={expired ? 'mt-2 text-xs font-medium text-amber-900' : 'mt-2 text-xs text-stone-600'}>
      {expired ? 'This quote has expired. Request a fresh price before paying.' : <>Quote valid until {formatDateTime(delivery.expiresAt)}.</>}
    </p>
  )
}

function SavedDeliveryDetails({ delivery }: { delivery: DeliveryOrderView }) {
  // For centre collection, the server-resolved destination is the immutable
  // GIG centre address. Do not replace it with the member's search city/LGA.
  const destination = deliveryDestinationLabel(delivery)
  return (
    <div className="mt-5 grid gap-4 border-t border-stone-200 pt-5 sm:grid-cols-2">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">Recipient</p>
        <p className="mt-1 break-words text-sm text-[#171412]">{delivery.recipientName}</p>
        <p className="mt-1 break-words text-sm text-stone-600">{delivery.phone}</p>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-stone-500">Delivery destination</p>
        <p className="mt-1 break-words text-sm leading-6 text-[#171412]">{destination}</p>
        <p className="mt-1 text-sm text-stone-600">{delivery.deliveryMode === 'service_centre' ? 'GIG centre collection' : 'Home delivery'}</p>
      </div>
    </div>
  )
}

function DeliveryStatusPanel({
  delivery,
  now,
  onPay,
  onCheck,
  checking,
  onEdit,
}: {
  delivery: DeliveryOrderView
  now: number
  onPay: () => void
  onCheck: () => void
  checking: boolean
  onEdit: () => void
}) {
  // Only a still-quoted row can expire by its quote timestamp. Once payment
  // is open/paid/booking/dispatched, that timestamp must not relabel the
  // immutable payment or shipment lifecycle.
  const quoteExpired = delivery.status === 'quoted' && deliveryQuoteExpired(delivery, now)
  const expired = delivery.status === 'expired' || quoteExpired
  const canEdit = canEditDelivery(delivery, now)
  const canPay = canPayDelivery(delivery, now)
  const canResume = canResumeDelivery(delivery)
  const status = delivery.status

  return (
    <section aria-labelledby="delivery-status-title" className="rounded-[18px] border border-stone-200 bg-white p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700">
            {status === 'dispatched' ? <PackageCheck className="h-5 w-5" aria-hidden="true" /> : status === 'needs_review' ? <AlertCircle className="h-5 w-5" aria-hidden="true" /> : <Truck className="h-5 w-5" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-stone-500">Delivery order</p>
            <h2 id="delivery-status-title" className="mt-1 break-words text-xl font-semibold tracking-tight text-[#171412]">{status === 'dispatched' ? 'Your award is on its way' : status === 'needs_review' ? 'We are reviewing this delivery' : status === 'paid' || status === 'booking' ? 'Delivery payment received' : status === 'open' ? 'Delivery payment link ready' : 'Your delivery quote'}</h2>
          </div>
        </div>
        <span className={`inline-flex min-h-8 items-center rounded-full border px-3 text-xs font-medium ${statusClasses(status, expired)}`}>{statusLabel(status, expired)}</span>
      </div>

      {status === 'quoted' || status === 'expired' || status === 'open' ? <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-stone-600">Delivery fee</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums tracking-tight text-[#171412]">{formatDeliveryAmount(delivery.amountMinor, delivery.currency)}</p>
          {status === 'quoted' || status === 'expired' ? <QuoteExpiry delivery={delivery} now={now} /> : null}
        </div>
        {canPay || canResume ? <button type="button" onClick={onPay} disabled={checking} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#ffdf45] px-5 text-sm font-medium text-[#171412] transition hover:bg-[#ffd62b] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto">
          {checking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <ExternalLink className="h-4 w-4" aria-hidden="true" />}
          {checking ? 'Opening secure payment…' : canResume ? 'Continue delivery payment' : 'Pay delivery fee'}
        </button> : null}
      </div> : null}

      {status === 'quoted' && !expired ? <p className="mt-4 rounded-xl bg-stone-50 px-4 py-3 text-sm leading-6 text-stone-700">Review the saved destination below, then pay the delivery fee when you are ready.</p> : null}
      {status === 'expired' || (status === 'quoted' && quoteExpired) ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">This quote is kept for your records but cannot be paid. Requesting a new quote will create a fresh delivery price.</p> : null}
      {(status === 'creating' || status === 'open') && delivery.paymentMode === 'external_link' ? <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-950"><p className="font-medium">Delivery payment is not confirmed automatically.</p><p className="mt-1">After paying the exact quoted amount, contact <a href="mailto:info@top100afl.com?subject=Delivery%20payment%20verification" className="font-medium underline underline-offset-4">Top100 support</a> with your Bachs transaction reference and delivery ID <span className="font-medium">{delivery.id}</span>. We will verify the payment before booking.</p></div> : null}
      {(status === 'creating' || status === 'open') && delivery.paymentMode !== 'external_link' ? <div className="mt-5 rounded-xl border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-950"><p className="font-medium">Your delivery payment is still being verified.</p><p className="mt-1">We will only continue once the payment provider confirms this exact delivery order. You can check again below.</p></div> : null}
      {(status === 'paid' || status === 'booking') ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-950"><p className="font-medium">Payment received — your shipment is being prepared.</p><p className="mt-1">No further payment is needed. We will show the waybill here once the courier booking is confirmed.</p></div> : null}
      {status === 'dispatched' ? <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-950"><p className="font-medium">Your award has been dispatched.</p>{delivery.waybill ? <p className="mt-2 break-words">Waybill: <span className="font-medium">{delivery.waybill}</span></p> : <p className="mt-2">Waybill details are being updated.</p>}{delivery.trackingUrl ? <a href={delivery.trackingUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-10 items-center gap-2 font-medium underline underline-offset-4">Track delivery <ExternalLink className="h-4 w-4" aria-hidden="true" /></a> : null}</div> : null}
      {status === 'needs_review' ? <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-950"><p className="font-medium">Our delivery team needs to review this payment or booking.</p><p className="mt-1">Please do not pay again. Contact <a href="mailto:info@top100afl.com?subject=Award%20delivery%20review" className="font-medium underline underline-offset-4">Top100 support</a> and include reference <span className="font-medium">{delivery.id}</span>.</p></div> : null}

      <SavedDeliveryDetails delivery={delivery} />
      <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-stone-100 pt-4">
        {(LOCKED_STATUSES.includes(status) || status === 'quoted' || status === 'expired') ? <button type="button" onClick={onCheck} disabled={checking} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 px-4 text-sm font-medium text-stone-800 transition hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 disabled:cursor-not-allowed disabled:opacity-60">
          {checking ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="h-4 w-4" aria-hidden="true" />}
          {checking ? 'Checking payment status…' : 'Check payment status'}
        </button> : null}
        {canEdit ? <button type="button" onClick={onEdit} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-orange-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">{status === 'expired' || expired ? 'Get a new quote' : 'Edit quote'}</button> : null}
      </div>
    </section>
  )
}
export default function AwardDeliveryPage() {
  const { member } = useDashboardMember()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [payment, setPayment] = useState<AwardPaymentView | null>(null)
  const [delivery, setDelivery] = useState<DeliveryOrderView | null>(null)
  const [includedDelivery, setIncludedDelivery] = useState<IncludedDeliveryView | null>(null)
  const [recipientName, setRecipientName] = useState(member.name)
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [ready, setReady] = useState(false)
  const returnHandled = useRef(false)
  const reconciling = useRef(false)

  const loadDelivery = useCallback(async () => {
    const response = await fetch('/api/member/award/delivery', { cache: 'no-store' })
    const body = await response.json().catch(() => ({}))
    if (!response.ok) throw new Error(readMessage(body, 'Could not load your delivery order.'))
    const nextDelivery = (body as DeliveryResponse).delivery ?? null
    setDelivery(nextDelivery)
    setIncludedDelivery(parseIncludedDelivery((body as DeliveryResponse).includedDelivery))
    if (nextDelivery) {
      setRecipientName(nextDelivery.recipientName)
      setPhone(nextDelivery.phone)
    }
  }, [])

  const reconcileDelivery = useCallback(async (fromReturn = false) => {
    if (reconciling.current) return
    reconciling.current = true
    setChecking(true)
    setError('')
    try {
      const response = await fetch('/api/member/award/delivery/reconcile', { ...deliveryReconcileRequest(), cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readMessage(body, 'Payment verification is temporarily unavailable. Please try again.'))
      if (!body.delivery) throw new Error('Payment status could not be confirmed. Please try again.')
      setDelivery(body.delivery as DeliveryOrderView)
      if (fromReturn) router.replace('/dashboard/me/award/delivery')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Payment verification is temporarily unavailable. Please try again.')
    } finally {
      reconciling.current = false
      setChecking(false)
    }
  }, [router])

  const loadPage = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/member/award/payment', { cache: 'no-store' })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readMessage(body, 'Could not verify your award payment.'))
      const awardPayment = body as AwardPaymentView
      if (!paymentIsConfirmed(awardPayment)) {
        router.replace('/dashboard/me/award?intro=continued')
        return
      }
      setPayment(awardPayment)
      await loadDelivery()
      setReady(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load your delivery details.')
    } finally {
      setLoading(false)
    }
  }, [loadDelivery, router])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadPage() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadPage])

  useEffect(() => {
    if (!ready || returnHandled.current || !shouldReconcileDeliveryReturn(window.location.search)) return
    returnHandled.current = true
    void reconcileDelivery(true)
  }, [ready, reconcileDelivery, searchParams])

  useEffect(() => {
    if (!delivery || delivery.status !== 'quoted') return
    const timer = window.setInterval(() => setNow(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [delivery])

  const deliveryExpired = delivery ? deliveryQuoteExpired(delivery, now) : false
  const customQuoteBody = useMemo(() => ({ recipientName: recipientName.trim(), phone, country: 'Nigeria', countryCode: 'NG' }), [phone, recipientName])

  function handleQuoted(_quote: DeliveryPreviewQuote, body: Record<string, unknown>) {
    const nextDelivery = body.delivery
    if (nextDelivery && typeof nextDelivery === 'object') {
      setError('')
      setDelivery(nextDelivery as DeliveryOrderView)
      setFormOpen(false)
      setNow(Date.now())
    }
  }

  async function startCheckout() {
    if (!delivery || (!canPayDelivery(delivery, now) && !canResumeDelivery(delivery)) || checkoutBusy) return
    setCheckoutBusy(true)
    setError('')
    try {
      const response = await fetch('/api/member/award/delivery/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(deliveryCheckoutBody(delivery.id)),
        cache: 'no-store',
      })
      const body = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(readMessage(body, 'Could not open delivery payment. Please try again.'))
      if (typeof body.checkoutUrl === 'string' && body.checkoutUrl) {
        if (!isHostedCheckoutUrl(body.checkoutUrl)) throw new Error('The secure payment link was not valid. Please refresh and try again.')
        if (body.checkoutMode === 'external_link' || body.checkoutUrl === BACHS_DELIVERY_PAYMENT_LINK) {
          const serverAmountMinor = typeof body.amountMinor === 'number' && Number.isSafeInteger(body.amountMinor) && body.amountMinor > 0 ? body.amountMinor : delivery.amountMinor
          const accepted = window.confirm(deliveryPaymentWarning({ amountMinor: serverAmountMinor, email: member.email, deliveryId: delivery.id }))
          if (!accepted) return
        }
        window.location.assign(body.checkoutUrl)
        return
      }
      await loadDelivery()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open delivery payment. Please try again.')
    } finally {
      setCheckoutBusy(false)
    }
  }

  if (loading || (payment && !ready && !error)) return <AwardRouteLoading label="Verifying your award payment" />

  if (error && !payment) {
    return (
      <section role="alert" className="max-w-3xl rounded-[18px] border border-rose-200 bg-white p-5 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#171412]">Delivery details could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[#625B52]">{error}</p>
        <button type="button" onClick={() => void loadPage()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171412] px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
      </section>
    )
  }

  if (error && payment && !ready) {
    return (
      <section role="alert" className="max-w-3xl rounded-[18px] border border-rose-200 bg-white p-5 sm:p-8">
        <h1 className="text-2xl font-semibold tracking-tight text-[#171412]">Delivery details could not load</h1>
        <p className="mt-2 text-sm leading-6 text-[#625B52]">{error}</p>
        <button type="button" onClick={() => void loadPage()} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#171412] px-4 text-sm font-medium text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2"><RefreshCw className="h-4 w-4" aria-hidden="true" />Try again</button>
      </section>
    )
  }

  if (!payment || !paymentIsConfirmed(payment)) return <AwardRouteLoading label="Verifying your award payment" />

  const showIncludedDelivery = shouldShowIncludedDelivery(includedDelivery, delivery)
  const showForm = !showIncludedDelivery && (!delivery || Boolean(delivery && canEditDelivery(delivery, now) && (formOpen || delivery.status === 'expired' || (delivery.status === 'quoted' && deliveryExpired))))

  return (
    <section className="min-w-0 max-w-3xl space-y-5 pb-8">
      <Link href="/dashboard/me/award/complete" className="inline-flex min-h-10 items-center gap-2 text-sm font-medium text-orange-800 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />Back to your awards
      </Link>
      <header className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-orange-700">Physical award</p>
        <h1 className="text-3xl font-semibold tracking-tight text-[#171412] sm:text-4xl">Arrange delivery</h1>
        <p className="max-w-2xl text-sm leading-6 text-[#625B52] sm:text-base">Your award fee is confirmed. Delivery is priced and paid separately, so you can review the destination before opening secure payment.</p>
      </header>

      {error ? <div role="alert" className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /><p>{error}</p></div> : null}

      <DeliveryFeeSummary payment={payment} delivery={delivery} deliveryAlreadyIncluded={showIncludedDelivery} />

      {delivery ? <DeliveryStatusPanel delivery={delivery} now={now} checking={checking || checkoutBusy} onPay={() => void startCheckout()} onCheck={() => void reconcileDelivery()} onEdit={() => setFormOpen(true)} /> : null}

      {showIncludedDelivery && includedDelivery ? <IncludedDeliveryPanel delivery={includedDelivery} /> : null}

      {showForm ? <DeliveryCostChecker
        quoteEndpoint="/api/member/award/delivery"
        quoteFields={customQuoteBody}
        onQuoted={handleQuoted}
        nigeriaOnly
        eyebrow={delivery ? 'New delivery quote' : 'Award delivery'}
        title={delivery ? 'Refresh delivery price' : 'Get a delivery quote'}
        description="Save your Nigerian destination and see the delivery fee. Your award fee remains paid separately."
        quoteDisclaimer="This saves your destination and delivery quote. No payment is taken and delivery is not booked until you confirm the separate delivery charge."
        backHref="/dashboard/me/award/complete"
        backLabel="Back to your awards"
        initialDraft={delivery ? {
          deliveryMode: delivery.deliveryMode,
          country: delivery.country,
          countryCode: 'NG',
          addressLine1: delivery.addressLine1,
          addressLine2: delivery.addressLine2,
          city: delivery.city,
          state: delivery.state,
          postalCode: delivery.postalCode,
          serviceCentreId: delivery.serviceCentreId,
          serviceCentre: delivery.deliveryMode === 'service_centre' && delivery.serviceCentreId ? {
            id: delivery.serviceCentreId,
            name: delivery.destination || 'Saved GIG collection centre',
            address: delivery.destination || '',
          } : undefined,
        } : undefined}
        additionalFields={<div className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="delivery-recipient-name" className="text-sm font-medium text-[#292521]">Recipient name</label>
            <input id="delivery-recipient-name" autoComplete="name" required minLength={2} maxLength={120} value={recipientName} onChange={event => setRecipientName(event.target.value)} className="min-h-12 w-full min-w-0 rounded-xl border border-stone-300 bg-white px-3 text-base text-[#171412] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500" />
            <p className="text-xs leading-5 text-stone-600">Use the name the courier should call on the parcel.</p>
          </div>
          <DeliveryPhone defaultValue={phone} deliveryCountry="Nigeria" required onChange={setPhone} />
        </div>}
      /> : null}

      {delivery && showForm && delivery.status === 'quoted' && !deliveryExpired ? <button type="button" onClick={() => setFormOpen(false)} className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium text-stone-700 underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600">Keep saved quote</button> : null}
      <p className="flex items-start gap-2 text-xs leading-5 text-stone-500"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />Payment confirmation and booking are checked by Top100 before your delivery is dispatched.</p>
    </section>
  )
}
