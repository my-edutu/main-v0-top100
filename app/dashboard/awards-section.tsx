'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  Check,
  Loader2,
  LockKeyhole,
  PackageCheck,
  RefreshCw,
  Truck,
} from 'lucide-react'
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

import { AwardJourney } from './_components/award-journey'
import {
  awardStepPath,
  awardStepRedirect,
  resolveAwardStep,
  shouldAdvanceFromAwardQuote,
  validateAwardAddress,
  type AwardAddressErrors,
  type AwardAddressValues,
  type AwardJourneyStep,
} from './_lib/award-journey'

const TRACKING_STATUSES = ['paid', 'dispatched', 'in_transit', 'delivered']
const PAYMENT_CONFIRMATION_POLL_MS = 4000
const PAYMENT_CONFIRMATION_MAX_ATTEMPTS = 15

type AwardsSectionProps = {
  member: MemberProfile
  step?: AwardJourneyStep
  onClaimStateChange?: (needsClaim: boolean) => void
  paymentPending?: boolean
}

export default function AwardsSection({
  member,
  step,
  onClaimStateChange,
  paymentPending = false,
}: AwardsSectionProps) {
  const router = useRouter()
  const [state, setState] = useState<AwardState | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [notice, setNotice] = useState('')
  const [fieldErrors, setFieldErrors] = useState<AwardAddressErrors>({})
  const [paymentConfirmation, setPaymentConfirmation] = useState<
    'idle' | 'polling' | 'timed_out'
  >(paymentPending ? 'polling' : 'idle')

  const applyState = useCallback(
    (update: AwardState | ((previous: AwardState | null) => AwardState)) => {
      setState((previous) =>
        typeof update === 'function' ? update(previous) : update,
      )
    },
    [],
  )

  const needsClaim = state?.needsClaim
  useEffect(() => {
    if (needsClaim !== undefined) onClaimStateChange?.(needsClaim)
  }, [needsClaim, onClaimStateChange])

  const loadAward = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    try {
      const next = await fetchAwardOrder()
      applyState(next)
      if (next.order?.status === 'quote_failed') {
        setNotice(
          'We could not price delivery to this address. Our team will follow up, or you can correct the address and try again.',
        )
      }
    } catch (cause) {
      setLoadError(
        cause instanceof Error ? cause.message : 'Could not load your award.',
      )
    } finally {
      setLoading(false)
    }
  }, [applyState])

  useEffect(() => {
    void loadAward()
  }, [loadAward])

  const orderStatusRef = useRef<string | null>(null)
  useEffect(() => {
    orderStatusRef.current = state?.order?.status ?? null
  }, [state])

  useEffect(() => {
    if (!paymentPending) return

    // Keep only the durable routed award URL. The local component retains the
    // polling state, so removing the transient query cannot expose a Pay button.
    router.replace('/dashboard/me/award')
  }, [paymentPending, router])

  useEffect(() => {
    if (loading || paymentConfirmation !== 'polling') return

    if (
      orderStatusRef.current &&
      TRACKING_STATUSES.includes(orderStatusRef.current)
    ) {
      setPaymentConfirmation('idle')
      router.replace(awardStepPath('tracking'))
      return
    }

    let attempts = 0
    const interval = window.setInterval(async () => {
      attempts += 1
      try {
        const next = await fetchAwardOrder()
        applyState(next)
        if (
          next.order &&
          TRACKING_STATUSES.includes(next.order.status)
        ) {
          window.clearInterval(interval)
          setPaymentConfirmation('idle')
          router.replace(awardStepPath('tracking'))
          return
        }
      } catch {
        // Confirmation polling is best-effort. A transient failure consumes
        // one attempt and never exposes a second checkout action.
      }

      if (attempts >= PAYMENT_CONFIRMATION_MAX_ATTEMPTS) {
        window.clearInterval(interval)
        setPaymentConfirmation('timed_out')
      }
    }, PAYMENT_CONFIRMATION_POLL_MS)

    return () => window.clearInterval(interval)
  }, [applyState, loading, paymentConfirmation, router])

  useEffect(() => {
    if (loading || loadError || !state || paymentConfirmation !== 'idle') return

    if (!step) {
      router.replace(awardStepPath(resolveAwardStep(state.order)))
      return
    }

    const redirectTo = awardStepRedirect(step, state.order)
    if (redirectTo) router.replace(redirectTo)
  }, [loadError, loading, paymentConfirmation, router, state, step])

  async function handleDeliverySubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const values: AwardAddressValues = {
      recipientName: String(form.get('recipientName') || ''),
      phone: String(form.get('phone') || ''),
      email: String(form.get('email') || ''),
      addressLine1: String(form.get('addressLine1') || ''),
      addressLine2: String(form.get('addressLine2') || ''),
      city: String(form.get('city') || ''),
      state: String(form.get('state') || ''),
      country: String(form.get('country') || ''),
      postalCode: String(form.get('postalCode') || ''),
    }
    const nextErrors = validateAwardAddress(values)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      setSubmitting(true)
      setNotice('')
      const result = await submitDeliveryDetails(values)
      applyState((previous) => ({
        order: result.order,
        awardPriceKobo:
          previous?.awardPriceKobo ?? result.order.awardAmountKobo,
        needsClaim: true,
      }))

      if (shouldAdvanceFromAwardQuote(result.order)) {
        toast.success(result.message || 'Delivery quote ready.')
        router.push(awardStepPath('review'))
      } else if (result.message) {
        setNotice(result.message)
      }
    } catch (cause) {
      toast.error(
        cause instanceof Error
          ? cause.message
          : 'Could not save your delivery details.',
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handlePay() {
    try {
      setSubmitting(true)
      const { authorizationUrl } = await startAwardCheckout()
      window.location.href = authorizationUrl
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Could not start the payment.',
      )
      setSubmitting(false)
    }
    // On success the browser navigates away. Keeping the button disabled is
    // deliberate: a second click must not mint a second Paystack session.
  }

  async function handleRefreshTracking() {
    try {
      setRefreshing(true)
      const { order } = await refreshAwardTracking()
      applyState((previous) => ({
        order,
        awardPriceKobo:
          previous?.awardPriceKobo ?? order.awardAmountKobo,
        needsClaim: false,
      }))
    } catch (cause) {
      toast.error(
        cause instanceof Error ? cause.message : 'Could not refresh tracking.',
      )
    } finally {
      setRefreshing(false)
    }
  }

  if (loading) return <AwardRouteLoading label="Loading your award journey" />

  if (loadError) {
    return (
      <section
        role="alert"
        className="rounded-[20px] border border-rose-200 bg-white p-5 sm:p-7"
      >
        <h1 className="text-2xl font-extrabold tracking-tight text-[#171412]">
          Your award did not load
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#625B52]">
          {loadError}
        </p>
        <Button
          type="button"
          onClick={() => void loadAward()}
          className="mt-5 min-h-11 rounded-xl bg-[#171412] text-white hover:bg-[#312B27]"
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      </section>
    )
  }

  if (paymentConfirmation !== 'idle') {
    return (
      <PaymentConfirmationPanel
        timedOut={paymentConfirmation === 'timed_out'}
      />
    )
  }

  if (!state || !step || awardStepRedirect(step, state.order)) {
    return <AwardRouteLoading label="Opening the next award step" />
  }

  const order = state.order

  if (step === 'address') {
    return (
      <AwardJourney
        current="address"
        title="Where should we send your award?"
        description="Add a reachable contact and the exact delivery address. We use it to request a live courier quote."
        imageSrc="/dashboard/award/address.webp"
        imageAlt="Award parcel prepared for delivery"
      >
        {notice ? <AwardNotice>{notice}</AwardNotice> : null}
        <AddressForm
          member={member}
          order={order}
          errors={fieldErrors}
          submitting={submitting}
          onSubmit={handleDeliverySubmit}
        />
      </AwardJourney>
    )
  }

  if (step === 'review' && order) {
    return (
      <AwardJourney
        current="review"
        title="Review delivery and total"
        description="Confirm the destination and full live quote before moving to secure payment."
        imageSrc="/dashboard/award/review.webp"
        imageAlt="Africa Future Leaders award ready for review"
      >
        <ReviewPanel order={order} />
      </AwardJourney>
    )
  }

  if (step === 'payment' && order) {
    return (
      <AwardJourney
        current="payment"
        title="Complete secure payment"
        description="Paystack handles the payment securely. Your card details are never stored by Top100 Africa."
        imageSrc="/dashboard/award/review.webp"
        imageAlt="Secure award payment handoff"
      >
        <PaymentPanel
          order={order}
          paying={submitting}
          onPay={handlePay}
        />
      </AwardJourney>
    )
  }

  if (step === 'tracking' && order) {
    return (
      <AwardJourney
        current="tracking"
        title={order.status === 'delivered' ? 'Your award arrived' : 'Track your award'}
        description="Payment is confirmed. Follow preparation, dispatch and delivery from here."
        imageSrc="/dashboard/award/tracking.webp"
        imageAlt="Award parcel moving through delivery"
      >
        <TrackingPanel
          order={order}
          onRefresh={handleRefreshTracking}
          refreshing={refreshing}
        />
      </AwardJourney>
    )
  }

  return <AwardRouteLoading label="Opening the next award step" />
}

export function AwardRouteLoading({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="space-y-4 rounded-[20px] border border-[#E7DDCF] bg-white p-5 sm:p-7"
    >
      <div className="h-3 w-36 animate-pulse rounded-full bg-[#FFE7D5] motion-reduce:animate-none" />
      <div className="h-8 w-3/4 animate-pulse rounded-xl bg-[#E8EBF0] motion-reduce:animate-none" />
      <div className="h-4 w-full animate-pulse rounded-full bg-[#E8EBF0] motion-reduce:animate-none" />
      <div className="h-32 animate-pulse rounded-[16px] bg-[#FBF7EF] motion-reduce:animate-none" />
      <span className="sr-only">{label}</span>
    </div>
  )
}

function PaymentConfirmationPanel({ timedOut }: { timedOut: boolean }) {
  return (
    <section
      role="status"
      className="rounded-[20px] border border-amber-200 bg-white p-5 sm:p-7"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-[#FFE49A] text-[#563700]">
          <Loader2
            className={`h-6 w-6 ${timedOut ? '' : 'animate-spin motion-reduce:animate-none'}`}
            aria-hidden="true"
          />
        </div>
        <div>
          <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6C2600]">
            Payment return
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#171412]">
            {timedOut
              ? 'Your confirmation is still processing'
              : 'Confirming your payment'}
          </h1>
          <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-[#625B52]">
            {timedOut
              ? 'Do not pay again. Our team will match the successful payment to your order. If this has not updated soon, contact info@top100afl.com.'
              : 'Paystack may return before its signed webhook reaches us. This page will update automatically, and payment is unavailable while we confirm it.'}
          </p>
        </div>
      </div>
    </section>
  )
}

function AddressForm({
  member,
  order,
  errors,
  submitting,
  onSubmit,
}: {
  member: MemberProfile
  order: AwardOrder | null
  errors: AwardAddressErrors
  submitting: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {Object.keys(errors).length > 0 ? (
        <div role="alert" className="rounded-[16px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-900">
          Check the highlighted delivery details before continuing.
        </div>
      ) : null}

      <fieldset>
        <legend className="text-lg font-extrabold text-[#171412]">Delivery contact</legend>
        <p className="mt-1 text-sm font-semibold text-[#625B52]">The courier will use these details to reach you.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AwardField label="Full name" name="recipientName" defaultValue={order?.recipientName || member.name} error={errors.recipientName} autoComplete="name" />
          <AwardField label="Phone number" name="phone" type="tel" defaultValue={order?.phone || ''} error={errors.phone} autoComplete="tel" />
          <AwardField label="Email" name="email" type="email" defaultValue={order?.email || member.email} error={errors.email} autoComplete="email" className="md:col-span-2" />
        </div>
      </fieldset>

      <fieldset className="border-t border-[#E7DDCF] pt-6">
        <legend className="text-lg font-extrabold text-[#171412]">Delivery address</legend>
        <p className="mt-1 text-sm font-semibold text-[#625B52]">Use the address where someone can receive the parcel.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <AwardField label="Street address" name="addressLine1" defaultValue={order?.addressLine1 || ''} error={errors.addressLine1} autoComplete="address-line1" className="md:col-span-2" />
          <AwardField label="Apartment, suite (optional)" name="addressLine2" defaultValue={order?.addressLine2 || ''} autoComplete="address-line2" className="md:col-span-2" />
          <AwardField label="City" name="city" defaultValue={order?.city || ''} error={errors.city} autoComplete="address-level2" />
          <AwardField label="State or region" name="state" defaultValue={order?.state || ''} error={errors.state} autoComplete="address-level1" />
          <AwardField label="Country" name="country" defaultValue={order?.country || ''} error={errors.country} autoComplete="country-name" />
          <AwardField label="Postal code (optional)" name="postalCode" defaultValue={order?.postalCode || ''} autoComplete="postal-code" />
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-3 border-t border-[#E7DDCF] pt-5">
        <Button asChild type="button" variant="outline" className="min-h-11 rounded-xl border-[#D4C7B6] bg-white text-[#171412]">
          <Link href="/dashboard/me">Back</Link>
        </Button>
        <Button type="submit" disabled={submitting} className="min-h-11 rounded-xl bg-[#F36C21] px-6 font-extrabold text-white hover:bg-[#D95412] disabled:bg-orange-200 disabled:text-[#625B52]">
          {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Getting delivery quote...</> : 'Continue to review'}
        </Button>
      </div>
    </form>
  )
}

function ReviewPanel({ order }: { order: AwardOrder }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <AwardSummary title="Delivery contact">
          <p>{order.recipientName}</p>
          <p>{order.phone}</p>
          <p>{order.email}</p>
        </AwardSummary>
        <AwardSummary title="Delivery address">
          <p>{order.addressLine1}{order.addressLine2 ? `, ${order.addressLine2}` : ''}</p>
          <p>{order.city}, {order.state}</p>
          <p>{order.country}{order.postalCode ? ` · ${order.postalCode}` : ''}</p>
        </AwardSummary>
      </div>

      <dl className="rounded-[16px] border border-[#E7DDCF] bg-[#FBF7EF] p-4 sm:p-5">
        <MoneyRow label="Africa Future Leaders Award" value={order.awardAmountKobo} />
        <MoneyRow label="Delivery · GIG Logistics" value={order.shippingAmountKobo ?? 0} />
        <MoneyRow label="Total" value={order.totalAmountKobo ?? 0} total />
      </dl>

      {order.status === 'awaiting_payment' ? (
        <AwardNotice>A payment session has already been started for this total. Continue to the payment step; do not open multiple checkout tabs.</AwardNotice>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {order.status === 'quoted' ? (
          <Button asChild type="button" variant="outline" className="min-h-11 rounded-xl border-[#D4C7B6] bg-white text-[#171412]">
            <Link href={awardStepPath('address')}>Edit address</Link>
          </Button>
        ) : null}
        <Button asChild type="button" className="min-h-11 rounded-xl bg-[#F36C21] px-6 font-extrabold text-white hover:bg-[#D95412]">
          <Link href={awardStepPath('payment')}>Continue to payment</Link>
        </Button>
      </div>
    </div>
  )
}

function PaymentPanel({ order, paying, onPay }: { order: AwardOrder; paying: boolean; onPay: () => void }) {
  return (
    <div className="space-y-5">
      <div className="rounded-[16px] border border-emerald-200 bg-[#CFF3DF] p-4 text-[#064C36] sm:p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-emerald-300 bg-white/60"><LockKeyhole className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 className="text-lg font-extrabold">Secure Paystack handoff</h2>
            <p className="mt-1 text-sm font-semibold leading-6">You will leave this page briefly to complete payment. Return here only through Paystack so we can confirm the signed webhook safely.</p>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between gap-4 rounded-[16px] border border-[#E7DDCF] bg-white p-4 sm:p-5">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#625B52]">Amount due</p><p className="mt-1 text-3xl font-extrabold tracking-tight text-[#171412]">{formatNaira(order.totalAmountKobo ?? 0)}</p></div>
        <Check className="h-7 w-7 text-emerald-700" aria-label="Quote reviewed" />
      </div>

      <div className="flex flex-wrap gap-3">
        <Button asChild type="button" variant="outline" className="min-h-11 rounded-xl border-[#D4C7B6] bg-white text-[#171412]">
          <Link href={awardStepPath('review')}>Back to review</Link>
        </Button>
        <Button type="button" onClick={onPay} disabled={paying} className="min-h-11 rounded-xl bg-[#171412] px-6 font-extrabold text-white hover:bg-[#312B27] disabled:bg-[#D4C7B6] disabled:text-[#625B52]">
          {paying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />Opening secure payment...</> : `Pay ${formatNaira(order.totalAmountKobo ?? 0)}`}
        </Button>
      </div>
    </div>
  )
}

function TrackingPanel({ order, onRefresh, refreshing }: { order: AwardOrder; onRefresh: () => void; refreshing: boolean }) {
  const statusIndex = order.status === 'delivered' ? 3 : order.status === 'in_transit' ? 2 : order.status === 'dispatched' ? 1 : 0
  const timeline = ['Payment confirmed', 'Dispatched', 'In transit', 'Delivered']

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4 rounded-[16px] border border-emerald-200 bg-[#CFF3DF] p-4 text-[#064C36] sm:p-5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] border border-emerald-300 bg-white/60">
          {order.status === 'delivered' ? <PackageCheck className="h-6 w-6" aria-hidden="true" /> : <Truck className="h-6 w-6" aria-hidden="true" />}
        </span>
        <div><h2 className="text-xl font-extrabold">{order.status === 'delivered' ? 'Delivery complete' : 'Payment confirmed'}</h2><p className="mt-1 text-sm font-semibold leading-6">{order.deliveryStatus || 'Your award is being prepared for dispatch.'}</p></div>
      </div>

      <ol aria-label="Award delivery timeline" className="grid gap-3 sm:grid-cols-4">
        {timeline.map((label, index) => (
          <li key={label} className={`rounded-[14px] border p-3 ${index <= statusIndex ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-[#E7DDCF] bg-white text-[#625B52]'}`}>
            <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current text-xs font-extrabold">{index < statusIndex || order.status === 'delivered' ? <Check className="h-4 w-4" aria-hidden="true" /> : index + 1}</span>
            <span className="mt-2 block text-xs font-extrabold">{label}</span>
          </li>
        ))}
      </ol>

      <dl className="grid gap-3 sm:grid-cols-2">
        <AwardInfo label="Paid" value={formatNaira(order.totalAmountKobo ?? 0)} />
        <AwardInfo label="Waybill" value={order.waybill || 'Assigned once dispatched'} />
      </dl>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={onRefresh} disabled={refreshing} className="min-h-11 rounded-xl border-[#D4C7B6] bg-white text-[#171412]">
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} aria-hidden="true" />{refreshing ? 'Refreshing...' : 'Refresh courier status'}
        </Button>
        {order.trackingUrl ? <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="flex min-h-11 items-center rounded-xl px-2 text-sm font-extrabold text-[#6C2600] underline decoration-2 underline-offset-4">Track on GIG Logistics</a> : null}
      </div>

      <p className="rounded-[14px] border border-[#E7DDCF] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#625B52]">Need help with delivery? Contact <a href="mailto:info@top100afl.com" className="font-extrabold text-[#6C2600] underline underline-offset-4">info@top100afl.com</a> and include your waybill when available.</p>
    </div>
  )
}

function AwardField({ label, name, defaultValue, error, type = 'text', autoComplete, className = '' }: { label: string; name: keyof AwardAddressValues; defaultValue: string; error?: string; type?: string; autoComplete?: string; className?: string }) {
  const id = `award-${name}`
  const errorId = `${id}-error`
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="font-extrabold text-[#171412]">{label}</Label>
      <Input id={id} name={name} type={type} defaultValue={defaultValue} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className="h-12 rounded-xl border-[#D4C7B6] bg-white text-base text-[#171412] aria-[invalid=true]:border-rose-600 aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-rose-600" />
      {error ? <p id={errorId} className="text-sm font-bold text-rose-700">{error}</p> : null}
    </div>
  )
}

function AwardSummary({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-[16px] border border-[#E7DDCF] bg-white p-4"><h2 className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6C2600]">{title}</h2><div className="mt-2 text-sm font-semibold leading-6 text-[#171412]">{children}</div></section>
}

function MoneyRow({ label, value, total = false }: { label: string; value: number; total?: boolean }) {
  return <div className={`flex items-center justify-between gap-4 py-2 ${total ? 'mt-2 border-t border-[#D4C7B6] pt-4' : ''}`}><dt className={total ? 'text-base font-extrabold text-[#171412]' : 'text-sm font-semibold text-[#625B52]'}>{label}</dt><dd className={total ? 'text-xl font-extrabold text-[#171412]' : 'text-sm font-extrabold text-[#171412]'}>{formatNaira(value)}</dd></div>
}

function AwardInfo({ label, value }: { label: string; value: string }) {
  return <div className="rounded-[14px] border border-[#E7DDCF] bg-white px-4 py-3"><dt className="text-xs font-extrabold uppercase tracking-[0.14em] text-[#6C2600]">{label}</dt><dd className="mt-1 break-words text-sm font-extrabold text-[#171412]">{value}</dd></div>
}

function AwardNotice({ children }: { children: React.ReactNode }) {
  return <div role="status" className="rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-950">{children}</div>
}
