'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/ui/button'
import {
  fetchAwardPayment,
  type AwardPaymentView,
} from '@/lib/awards/payment'
import type { MemberProfile } from '@/lib/member-hub'

import {
  awardPaymentScreen,
  paymentIsConfirmed,
  type AwardPaymentReturnState,
} from './award-payment-view'
import { AwardPaymentCard } from './award-payment-card'
import { AwardPaymentConfirmation } from './award-payment-confirmation'
import { AwardPaymentSuccess } from './award-payment-success'
import type { AwardJourneyStep } from './_lib/award-journey'

const PAYMENT_CONFIRMATION_POLL_MS = 4000
const PAYMENT_CONFIRMATION_MAX_ATTEMPTS = 15

type AwardsSectionProps = {
  member: MemberProfile
  /** Kept for links/bookmarks from the pre-Bachs multi-step award journey. */
  step?: AwardJourneyStep
  onClaimStateChange?: (needsPayment: boolean) => void
  /** Legacy callback prop; `done` now starts server confirmation polling. */
  paymentPending?: boolean
  paymentReturn?: AwardPaymentReturnState
  /** Alias for callers that use the pure selector's terminology. */
  returnState?: AwardPaymentReturnState
  /** Local demo callback query is explicit and never affects production state. */
  demoReturn?: boolean
}

type PaymentReadOptions = {
  completeDemoCallback?: boolean
}

async function readDemoAwarePayment({
  completeDemoCallback = false,
}: PaymentReadOptions = {}): Promise<AwardPaymentView> {
  if (!completeDemoCallback) return fetchAwardPayment()

  const response = await fetch(
    '/api/member/award/payment?payment=done&demo=1',
    { cache: 'no-store' },
  )
  const body = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof body?.message === 'string'
        ? body.message
        : 'Could not load award payment. Please try again.',
    )
  }
  return body as AwardPaymentView
}

export default function AwardsSection({
  member,
  step,
  onClaimStateChange,
  paymentPending = false,
  paymentReturn,
  returnState,
  demoReturn = false,
}: AwardsSectionProps) {
  const router = useRouter()
  const [resolvedReturnState] = useState<AwardPaymentReturnState>(
    () => paymentReturn ?? returnState ?? (paymentPending ? 'done' : 'none'),
  )
  const [resolvedDemoReturn] = useState(() => demoReturn)
  const [view, setView] = useState<AwardPaymentView | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [confirmationTimedOut, setConfirmationTimedOut] = useState(false)
  const pollingStartedRef = useRef(false)

  const readPayment = useCallback(async () => {
    return readDemoAwarePayment({
      completeDemoCallback: resolvedDemoReturn && resolvedReturnState === 'done',
    })
  }, [resolvedDemoReturn, resolvedReturnState])

  const loadPayment = useCallback(async () => {
    setLoading(true)
    setLoadError('')

    try {
      setView(await readPayment())
    } catch (cause) {
      setLoadError(
        cause instanceof Error
          ? cause.message
          : 'Could not load your award payment.',
      )
    } finally {
      setLoading(false)
    }
  }, [readPayment])

  useEffect(() => {
    if (!step) void loadPayment()
  }, [loadPayment, step])

  useEffect(() => {
    if (!step) return
    router.replace('/dashboard/me/award')
  }, [router, step])

  useEffect(() => {
    if (view?.needsPayment !== undefined) {
      onClaimStateChange?.(view.needsPayment)
    }
  }, [onClaimStateChange, view?.needsPayment])

  const screen = awardPaymentScreen(view, resolvedReturnState)
  const shouldPoll =
    !step &&
    !loading &&
    !confirmationTimedOut &&
    screen === 'confirming' &&
    (resolvedReturnState === 'done' ||
      view?.status === 'pending' ||
      view?.currentAttempt !== null)

  useEffect(() => {
    if (!shouldPoll || pollingStartedRef.current) return

    pollingStartedRef.current = true
    let cancelled = false
    let attempts = 0
    let timer: number | undefined

    const poll = async () => {
      if (cancelled) return
      attempts += 1

      try {
        const next = await readPayment()
        if (cancelled) return
        setView(next)
        if (paymentIsConfirmed(next)) return
      } catch {
        // A failed poll does not change the server-owned payment state. Keep
        // the no-retry confirmation panel visible and try again if possible.
      }

      if (attempts >= PAYMENT_CONFIRMATION_MAX_ATTEMPTS) {
        if (!cancelled) setConfirmationTimedOut(true)
        return
      }

      timer = window.setTimeout(poll, PAYMENT_CONFIRMATION_POLL_MS)
    }

    timer = window.setTimeout(poll, PAYMENT_CONFIRMATION_POLL_MS)

    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [readPayment, shouldPoll])

  if (step) {
    return <AwardRouteLoading label="Opening your award payment" />
  }

  if (loading && !view) {
    return <AwardRouteLoading label={`Loading ${member.name}'s award payment`} />
  }

  if (loadError && !view) {
    return (
      <section
        role="alert"
        className="rounded-[22px] border border-rose-200 bg-white p-5 sm:p-8"
      >
        <h1 className="text-2xl font-semibold tracking-tight text-[#171412]">
          Your award payment did not load
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625B52]">
          {loadError}
        </p>
        <Button
          type="button"
          onClick={() => {
            pollingStartedRef.current = false
            setConfirmationTimedOut(false)
            void loadPayment()
          }}
          className="mt-5 min-h-11 rounded-xl bg-[#171412] text-white hover:bg-[#312B27]"
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      </section>
    )
  }

  if (screen === 'confirming') {
    return (
      <AwardPaymentConfirmation
        timedOut={confirmationTimedOut}
        supportRequired={
          view?.status === 'refunded' ||
          ['underpaid', 'overpaid', 'exception'].includes(
            view?.currentAttempt?.status ?? '',
          )
        }
        resumeUrl={
          resolvedReturnState !== 'done'
            ? view?.currentAttempt?.checkoutUrl
            : null
        }
      />
    )
  }

  if (screen === 'paid' && view?.confirmedPayment) {
    return <AwardPaymentSuccess payment={view.confirmedPayment} />
  }

  if (screen === 'paid') {
    return <AwardPaymentConfirmation timedOut supportRequired />
  }

  if (!view) {
    return <AwardRouteLoading label="Opening your award payment" />
  }

  return (
    <AwardPaymentCard
      view={view}
      cancelled={resolvedReturnState === 'cancelled'}
    />
  )
}

export function AwardRouteLoading({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="space-y-4 rounded-[22px] border border-[#E7DDCF] bg-white p-5 sm:p-8"
    >
      <div className="h-3 w-36 animate-pulse rounded-full bg-[#FFE7D5] motion-reduce:animate-none" />
      <div className="h-8 w-3/4 animate-pulse rounded-xl bg-[#E8EBF0] motion-reduce:animate-none" />
      <div className="h-4 w-full animate-pulse rounded-full bg-[#E8EBF0] motion-reduce:animate-none" />
      <div className="h-32 animate-pulse rounded-[16px] bg-[#FBF7EF] motion-reduce:animate-none" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
