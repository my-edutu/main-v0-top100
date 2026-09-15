import { Loader2, ShieldCheck } from 'lucide-react'
import Link from 'next/link'

type AwardPaymentConfirmationProps = {
  timedOut?: boolean
  resumeUrl?: string | null
  supportRequired?: boolean
}

export function AwardPaymentConfirmation({
  timedOut = false,
  resumeUrl = null,
  supportRequired = false,
}: AwardPaymentConfirmationProps) {
  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-[22px] border border-amber-200 bg-white p-5 sm:p-8"
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[15px] bg-[#FFE49A] text-[#563700]">
          {timedOut ? (
            <ShieldCheck className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Loader2
              className="h-6 w-6 animate-spin motion-reduce:animate-none"
              aria-hidden="true"
            />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6C2600]">
            Payment confirmation
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#171412] sm:text-3xl">
            {supportRequired
              ? 'Your payment needs support review'
              : timedOut
              ? 'Still confirming your payment'
              : "We're confirming your payment"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#625B52] sm:text-base">
            {supportRequired
              ? 'Please contact support so we can reconcile this payment. Do not retry while this review is open.'
              : timedOut
              ? "Still confirming — please don't retry payment. Contact support if this does not update shortly."
              : resumeUrl
                ? 'A payment checkout is still open. Continue that checkout to finish, or return here once your payment is confirmed.'
                : "You've returned to Top100. We're waiting for your payment confirmation. Please don't start another checkout."}
          </p>
          {resumeUrl ? (
            <Link
              href={resumeUrl}
              className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-[#171412] px-4 text-sm font-semibold text-white hover:bg-[#312B27] focus-visible:outline focus-visible:ring-2 focus-visible:ring-[#F36C21] focus-visible:ring-offset-2"
            >
              Continue payment checkout
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  )
}
