import { ArrowUpRight, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'

import type { AwardPaymentView } from '@/lib/awards/payment'

type AwardPaymentSuccessProps = {
  payment: NonNullable<AwardPaymentView['confirmedPayment']>
}

type ConfirmedAwardPayment = NonNullable<AwardPaymentView['confirmedPayment']>

function formatPaymentAmount(
  currency: ConfirmedAwardPayment['currency'],
  amountMinor: number,
) {
  const amount = amountMinor / 100
  const formatted = new Intl.NumberFormat(currency === 'NGN' ? 'en-NG' : 'en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: currency === 'NGN' ? 0 : 2,
  }).format(amount)

  return currency === 'NGN' ? `₦${formatted}` : `$${formatted}`
}

function formatPaidAt(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'the confirmation date'

  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
  }).format(date)
}

export function AwardPaymentSuccess({ payment }: AwardPaymentSuccessProps) {
  return (
    <section
      role="status"
      aria-labelledby="award-payment-success-title"
      className="award-payment-receipt"
    >
      <div className="award-payment-receipt-glow" aria-hidden="true" />
      <div className="award-payment-receipt-card">
        <div className="award-payment-receipt-icon">
          <CheckCircle2 className="h-8 w-8" strokeWidth={2.25} aria-hidden="true" />
        </div>
        <p className="award-payment-receipt-kicker">Award payment confirmed</p>
        <h1 id="award-payment-success-title">Your award fee is paid</h1>
        <p className="award-payment-receipt-lede">
          We confirmed {formatPaymentAmount(payment.currency, payment.amountMinor)} on{' '}
          {formatPaidAt(payment.paidAt)}.
        </p>

        <div className="award-payment-receipt-rule" aria-hidden="true" />
        <dl className="award-payment-receipt-details">
          <div>
            <dt>Status</dt>
            <dd><span aria-hidden="true">✓</span> Paid</dd>
          </div>
          <div>
            <dt>Amount paid</dt>
            <dd>{formatPaymentAmount(payment.currency, payment.amountMinor)}</dd>
          </div>
          <div>
            <dt>Confirmed</dt>
            <dd>{formatPaidAt(payment.paidAt)}</dd>
          </div>
        </dl>

        <p className="award-payment-receipt-note">
          Delivery through GIG Logistics and its delivery charge are handled separately. We’ll
          guide you through that next step.
        </p>

        <Link href="/dashboard" className="award-payment-receipt-link">
          Return to dashboard <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  )
}
