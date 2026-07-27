'use client'

import { FormEvent, useCallback, useEffect, useState } from 'react'
import { Loader2, PackageCheck, RefreshCw, Trophy, Truck } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatNaira } from '@/lib/awards/money'
import {
  fetchAwardOrder,
  refreshAwardTracking,
  startAwardCheckout,
  submitDeliveryDetails,
  type AwardOrder,
  type AwardState,
} from '@/lib/awards'
import type { MemberProfile } from '@/lib/member-hub'

// Statuses at which the courier already has the parcel, so the address is
// locked and the member sees tracking instead of a form.
const TRACKING_STATUSES = ['paid', 'dispatched', 'in_transit', 'delivered']

export default function AwardsSection({
  member,
  onClaimStateChange,
}: {
  member: MemberProfile
  onClaimStateChange?: (needsClaim: boolean) => void
}) {
  const [state, setState] = useState<AwardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [quoting, setQuoting] = useState(false)
  const [paying, setPaying] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState('')
  // Lets a member with a quote go back and correct their address.
  const [editingAddress, setEditingAddress] = useState(false)

  // Accepts either a full snapshot (the initial load, which already has a
  // complete, server-sourced AwardState) or an updater function that derives
  // the next state from whatever is currently in place. The updater form is
  // what every post-load call site uses: it goes through setState's
  // functional-update path, so it always sees the real previous state — never
  // a stale closure and never a null cast — and can fall back to a coherent
  // value if that previous state happens to be null.
  const applyState = useCallback(
    (update: AwardState | ((previous: AwardState | null) => AwardState)) => {
      setState((previous) => {
        const next = typeof update === 'function' ? update(previous) : update
        onClaimStateChange?.(next.needsClaim)
        return next
      })
    },
    [onClaimStateChange],
  )

  useEffect(() => {
    let cancelled = false
    fetchAwardOrder()
      .then((next) => {
        if (!cancelled) {
          applyState(next)
          setLoadError('')
          // The route that produced quote_failed also sent a message, but
          // that only ever lived in this component's local `notice` state —
          // it does not persist server-side. Without this, a member who
          // reloads mid-quote_failed sees a bare delivery form with no
          // explanation of what happened or that the team is already on it.
          if (next.order?.status === 'quote_failed') {
            setNotice(
              'We could not price delivery to your address. Our team will be in touch about it — feel free to edit your address below to try again.',
            )
          }
        }
      })
      .catch((error) => {
        if (!cancelled) setLoadError(error instanceof Error ? error.message : 'Could not load your award.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [applyState])

  async function handleDeliverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)

    try {
      setQuoting(true)
      setNotice('')
      const result = await submitDeliveryDetails({
        recipientName: String(form.get('recipientName') || ''),
        phone: String(form.get('phone') || ''),
        email: String(form.get('email') || ''),
        addressLine1: String(form.get('addressLine1') || ''),
        addressLine2: String(form.get('addressLine2') || ''),
        city: String(form.get('city') || ''),
        state: String(form.get('state') || ''),
        country: String(form.get('country') || ''),
        postalCode: String(form.get('postalCode') || ''),
      })

      // awardPriceKobo is the standing price the /api/member/award GET
      // returned on load; it isn't part of the quote response, so it must be
      // carried forward from whatever we already had. If we somehow have no
      // previous state (e.g. this resolves before the initial load ever
      // did), fall back to the order's own award amount — the two are the
      // same figure at this point, so that fallback is coherent, not a guess.
      applyState((previous) => ({
        order: result.order,
        awardPriceKobo: previous?.awardPriceKobo ?? result.order.awardAmountKobo,
        needsClaim: true,
      }))
      setEditingAddress(false)

      if (result.message) {
        // quote_failed is informational, not an error — the team follows up.
        setNotice(result.message)
      } else {
        toast.success('Delivery quote ready. Review your total below.')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save your delivery details.'
      toast.error(message)
    } finally {
      setQuoting(false)
    }
  }

  async function handlePay() {
    try {
      setPaying(true)
      const { authorizationUrl } = await startAwardCheckout()
      window.location.href = authorizationUrl
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start the payment.'
      toast.error(message)
      setPaying(false)
    }
    // On success the browser navigates away, so `paying` stays true and the
    // button stays disabled — that is deliberate, it prevents a double charge.
  }

  async function handleRefreshTracking() {
    try {
      setRefreshing(true)
      const { order } = await refreshAwardTracking()
      applyState((previous) => ({
        order,
        awardPriceKobo: previous?.awardPriceKobo ?? order.awardAmountKobo,
        needsClaim: false,
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not refresh tracking.')
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) {
    return (
      <div className="grid min-h-[240px] place-items-center rounded-[28px] border border-orange-100 bg-white">
        <div className="text-center">
          <div className="mx-auto mb-3 inline-block h-7 w-7 animate-spin rounded-full border-b-2 border-t-2 border-orange-500" />
          <p className="text-sm font-semibold text-black/60">Loading your award...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="rounded-[28px] border border-orange-100 bg-white p-6">
        <p className="text-sm font-semibold text-orange-700">{loadError}</p>
      </div>
    )
  }

  const order = state?.order ?? null
  const showTracking = order ? TRACKING_STATUSES.includes(order.status) : false
  // awaiting_payment is a member who already started checkout — Paystack
  // deliberately admits both statuses as a legitimate retry (see the checkout
  // route). Showing the totals panel here again lets them just click Pay,
  // instead of falling through to the delivery form and re-triggering a live
  // courier quote at a possibly different price.
  const showTotals =
    !editingAddress &&
    (order?.status === 'quoted' || order?.status === 'awaiting_payment') &&
    order.totalAmountKobo !== null

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-orange-100 bg-white p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-[#fffaf0]">
            <Trophy className="h-7 w-7" strokeWidth={2.2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Your award</p>
            <h3 className="mt-2 text-3xl font-bold tracking-tight text-black">
              The Africa Future Leaders Award
            </h3>
            <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
              Every awardee receives the physical award. Add your delivery address to see your total,
              pay once, and track it to your door.
            </p>
          </div>
        </div>
      </section>

      {notice ? (
        <div role="status" className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
          <p className="text-sm font-medium leading-6 text-amber-900">{notice}</p>
        </div>
      ) : null}

      {showTracking && order ? (
        <TrackingPanel order={order} onRefresh={handleRefreshTracking} refreshing={refreshing} />
      ) : showTotals && order ? (
        <TotalsPanel
          order={order}
          paying={paying}
          onPay={handlePay}
          onEditAddress={() => setEditingAddress(true)}
        />
      ) : (
        <DeliveryForm member={member} order={order} onSubmit={handleDeliverySubmit} submitting={quoting} />
      )}
    </div>
  )
}

function DeliveryForm({
  member,
  order,
  onSubmit,
  submitting,
}: {
  member: MemberProfile
  order: AwardOrder | null
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  submitting: boolean
}) {
  return (
    <form onSubmit={onSubmit} className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6">
      <h4 className="text-2xl font-bold tracking-tight text-black">Where should we send it?</h4>
      <p className="mt-2 text-sm font-medium leading-6 text-black/60">
        Delivery is quoted live from this address, so double-check it before you pay.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <AwardField label="Full name" name="recipientName" defaultValue={order?.recipientName || member.name} />
        <AwardField label="Phone number" name="phone" defaultValue={order?.phone || ''} />
        <AwardField label="Email" name="email" type="email" defaultValue={order?.email || member.email} />
        <AwardField label="Street address" name="addressLine1" defaultValue={order?.addressLine1 || ''} />
        <AwardField label="Apartment, suite (optional)" name="addressLine2" defaultValue={order?.addressLine2 || ''} required={false} />
        <AwardField label="City" name="city" defaultValue={order?.city || ''} />
        <AwardField label="State or region" name="state" defaultValue={order?.state || ''} />
        <AwardField label="Country" name="country" defaultValue={order?.country || ''} />
        <AwardField label="Postal code (optional)" name="postalCode" defaultValue={order?.postalCode || ''} required={false} />
      </div>

      <Button
        type="submit"
        disabled={submitting}
        className="mt-6 rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Getting your delivery price...
          </>
        ) : (
          'Continue to total'
        )}
      </Button>
    </form>
  )
}

function TotalsPanel({
  order,
  paying,
  onPay,
  onEditAddress,
}: {
  order: AwardOrder
  paying: boolean
  onPay: () => void
  onEditAddress: () => void
}) {
  return (
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6">
      <h4 className="text-2xl font-bold tracking-tight text-black">Your total</h4>

      <dl className="mt-5 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm font-medium text-black/65">Africa Future Leaders Award</dt>
          <dd className="text-sm font-bold text-black">{formatNaira(order.awardAmountKobo)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm font-medium text-black/65">Delivery — GIG Logistics</dt>
          <dd className="text-sm font-bold text-black">{formatNaira(order.shippingAmountKobo ?? 0)}</dd>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-orange-100 pt-3">
          <dt className="text-base font-bold text-black">Total</dt>
          <dd className="text-xl font-bold text-black">{formatNaira(order.totalAmountKobo ?? 0)}</dd>
        </div>
      </dl>

      <p className="mt-4 text-sm font-medium leading-6 text-black/55">
        Delivering to {order.addressLine1}, {order.city}, {order.country}.
      </p>

      {order.status === 'awaiting_payment' ? (
        <p className="mt-3 text-sm font-medium leading-6 text-black/55">
          Looks like you already started a payment. You can carry on from here, or edit your address below if
          anything has changed.
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={onPay}
          disabled={paying}
          className="rounded-full bg-orange-500 px-8 py-6 text-[#fffaf0] hover:bg-orange-600 disabled:bg-orange-200 disabled:text-black/45"
        >
          {paying ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Taking you to payment...
            </>
          ) : (
            `Pay ${formatNaira(order.totalAmountKobo ?? 0)}`
          )}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onEditAddress}
          disabled={paying}
          className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
        >
          Edit address
        </Button>
      </div>
    </section>
  )
}

function TrackingPanel({
  order,
  onRefresh,
  refreshing,
}: {
  order: AwardOrder
  onRefresh: () => void
  refreshing: boolean
}) {
  const delivered = order.status === 'delivered'

  return (
    <section className="rounded-[28px] border border-orange-100 bg-white p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
          {delivered ? <PackageCheck className="h-6 w-6" strokeWidth={2.2} /> : <Truck className="h-6 w-6" strokeWidth={2.2} />}
        </div>
        <div className="min-w-0">
          <h4 className="text-2xl font-bold tracking-tight text-black">
            {delivered ? 'Delivered' : 'On its way'}
          </h4>
          <p className="mt-2 text-sm font-medium leading-6 text-black/60">
            {order.deliveryStatus || 'Your award is being prepared for dispatch.'}
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 sm:grid-cols-2">
        <AwardInfo label="Paid" value={formatNaira(order.totalAmountKobo ?? 0)} />
        <AwardInfo label="Waybill" value={order.waybill || 'Assigned once dispatched'} />
      </dl>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={onRefresh}
          disabled={refreshing}
          className="rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing' : 'Refresh status'}
        </Button>
        {order.trackingUrl ? (
          <a
            href={order.trackingUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm font-semibold text-orange-700 underline underline-offset-4"
          >
            Track on GIG Logistics
          </a>
        ) : null}
      </div>
    </section>
  )
}

function AwardField({
  label,
  name,
  defaultValue,
  type = 'text',
  required = true,
}: {
  label: string
  name: string
  defaultValue: string
  type?: string
  required?: boolean
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={`award-${name}`} className="font-semibold text-black">
        {label}
      </Label>
      <Input
        id={`award-${name}`}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="h-14 rounded-2xl border-orange-100 text-base text-black placeholder:text-black/40"
      />
    </div>
  )
}

function AwardInfo({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-orange-100 bg-[#fffaf4] px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-orange-600">{label}</dt>
      <dd className="mt-1 text-sm font-bold text-black">{value}</dd>
    </div>
  )
}
