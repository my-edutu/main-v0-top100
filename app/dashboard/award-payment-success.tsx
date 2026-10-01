import Image from 'next/image'
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
      className="flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_85%_0%,#153b2c_0,transparent_42%),#101116] px-5 py-10 text-white sm:px-8"
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col items-center text-center">
        <Image
          src="/illustrations/award-payment-confirmed.svg"
          alt=""
          aria-hidden="true"
          width={96}
          height={96}
          unoptimized
          className="h-20 w-20 sm:h-24 sm:w-24"
        />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
          Payment confirmed
        </p>
        <h1 id="award-payment-success-title" className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
          Your award is ready.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-[#D0C9D0] sm:text-xl sm:leading-8">
          We received {formatPaymentAmount(payment.currency, payment.amountMinor)} on{' '}
          {formatPaidAt(payment.paidAt)}. Your Africa Future Leaders recognition is confirmed.
        </p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#AAA3AD] sm:text-base sm:leading-7">
          Delivery through GIG Logistics and its delivery charge are arranged separately.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/dashboard/me/award/payment"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#35C98A] px-6 text-sm font-bold text-[#10251B] transition hover:bg-[#62DDA8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#17151B]"
          >
            View my award
          </Link>
        </div>
      </div>
    </section>
  )
}
