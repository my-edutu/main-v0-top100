import type { Ref } from 'react'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FESTIVAL_PAYMENT_PATH } from '@/lib/festival/config'
import type {
  FestivalInterest,
  FestivalPaymentState,
} from '@/lib/festival/interest'

const paymentLabels: Record<FestivalPaymentState, string> = {
  confirmed: 'Confirmed',
  required: 'Payment needed',
  pending: 'Verification in progress',
  unavailable: 'Unable to verify',
  not_requested: 'Not checked',
}

export function FestivalInterestSummary({
  interest,
  payment,
  onEdit,
  onCheckPayment,
  checking,
  error,
  summaryRef,
}: {
  interest: FestivalInterest
  payment: FestivalPaymentState
  onEdit: () => void
  onCheckPayment: () => void
  checking: boolean
  error: string
  summaryRef?: Ref<HTMLElement>
}) {
  const needsPayment =
    interest.pickupRequested &&
    (payment === 'required' || payment === 'pending')
  const canCheck =
    interest.pickupRequested &&
    (payment === 'unavailable' || payment === 'not_requested')
  return (
    <section
      className="festival-summary"
      aria-labelledby="festival-saved-title"
      tabIndex={-1}
      ref={summaryRef}
    >
      <div className="festival-summary__heading">
        <span className="festival-summary__check"><CheckCircle2 size={22} aria-hidden="true" /></span>
        <div>
          <h2 id="festival-saved-title">Interest registered</h2>
          <p className="festival-help">You’re on the list. We’ll be in touch with the next steps.</p>
        </div>
      </div>
      <dl className="festival-details">
        <div>
          <dt>Name</dt>
          <dd>{interest.fullName}</dd>
        </div>
        <div>
          <dt>Phone</dt>
          <dd>{interest.phone}</dd>
        </div>
        <div>
          <dt>Award pickup</dt>
          <dd>
            {interest.pickupRequested
              ? 'Requested at festival'
              : 'Not requested'}
          </dd>
        </div>
        {interest.pickupRequested && (
          <div>
            <dt>Award payment</dt>
            <dd
              className={
                payment === 'confirmed' ? 'festival-confirmed' : undefined
              }
            >
              {paymentLabels[payment]}
            </dd>
          </div>
        )}
      </dl>
      {interest.pickupRequested && payment === 'unavailable' && (
        <p className="festival-help">
          We couldn’t verify your award payment. Check again before paying.
        </p>
      )}
      {interest.pickupRequested && payment === 'pending' && (
        <div className="festival-help">
          <p>Check your existing payment before making another payment.</p>
          <button
            type="button"
            className="festival-text-action"
            onClick={onCheckPayment}
            disabled={checking}
          >
            {checking ? 'Checking payment…' : 'Check payment status'}
          </button>
        </div>
      )}
      {error && (
        <p className="festival-error" role="alert">
          {error}
        </p>
      )}
      <div className="festival-actions">
        {needsPayment && (
          <Button asChild className="festival-primary">
            <Link href={FESTIVAL_PAYMENT_PATH}>
              {payment === 'pending'
                ? 'Review payment'
                : 'Complete award payment'}
            </Link>
          </Button>
        )}
        {canCheck && (
          <Button
            type="button"
            variant="outline"
            className="festival-secondary"
            onClick={onCheckPayment}
            disabled={checking}
          >
            {checking ? 'Checking payment…' : 'Check payment status'}
          </Button>
        )}
        <Button
          type="button"
          variant={needsPayment || canCheck ? 'outline' : 'default'}
          className={needsPayment || canCheck ? 'festival-secondary' : 'festival-primary'}
          onClick={onEdit}
          disabled={checking}
        >
          Edit details
        </Button>
      </div>
      <p className="festival-help festival-summary__note">
        This registers your interest. The team will confirm attendance
        {interest.pickupRequested ? ' and award pickup arrangements' : ' details'} separately.
      </p>
    </section>
  )
}
