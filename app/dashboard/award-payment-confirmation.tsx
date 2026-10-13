import { Loader2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

type AwardPaymentConfirmationProps = {
  timedOut?: boolean
  resumeUrl?: string | null
  supportRequired?: boolean
  checking?: boolean
  onCheck?: () => void
}

export function AwardPaymentConfirmation({
  timedOut = false,
  resumeUrl = null,
  supportRequired = false,
  checking = false,
  onCheck,
}: AwardPaymentConfirmationProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-[22px] border border-amber-900 bg-[#211D1A] p-5 text-white sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#50381D] text-[#FFD997]">
          {timedOut || resumeUrl || supportRequired ? (
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Loader2
              className="h-6 w-6 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#FFB77E]">
            Payment confirmation
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {supportRequired
              ? 'Your payment needs support review'
              : resumeUrl
              ? 'Continue your payment'
              : timedOut
              ? 'Still confirming your payment'
              : "We're confirming your payment"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#D0C9D0] sm:text-base">
            {supportRequired
              ? 'Please contact support so we can reconcile this payment. Do not retry while this review is open.'
              : timedOut
              ? 'Confirmation is taking longer than expected. Check your payment status below. If you have already paid, please do not pay again.'
              : resumeUrl
                ? 'A payment checkout is still open. Continue that checkout to finish, or return here once your payment is confirmed.'
                : "You've returned to Top100. We're waiting for your payment confirmation. Please don't start another checkout."}
          </p>
          {resumeUrl ? (
            <Link
              href={resumeUrl}
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#F97316] px-4 text-sm font-semibold text-[#171412] hover:bg-[#FB923C] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#F36C21] focus-visible:ring-offset-2"
            >
              Continue payment checkout
            </Link>
          ) : null}
          {onCheck ? (
            <button type="button" disabled={checking} onClick={onCheck}
              className="mt-5 ml-0 inline-flex min-h-11 items-center rounded-xl border border-[#6A5038] px-4 text-sm font-semibold text-white disabled:opacity-60 sm:ml-3">
              {checking ? 'Checking payment…' : 'Check payment status'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
