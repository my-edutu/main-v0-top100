import type { Ref } from 'react'
import Link from 'next/link'
import { CheckCircle2, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FESTIVAL_DATE, FESTIVAL_PAYMENT_PATH, FESTIVAL_TICKET_PATH, FESTIVAL_VENUE } from '@/lib/festival/config'
import type {
  FestivalInterest,
  FestivalPaymentState,
  FestivalTicket,
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
  ticket,
  onRetryEmail,
}: {
  interest: FestivalInterest
  payment: FestivalPaymentState
  onEdit: () => void
  onCheckPayment: () => void
  checking: boolean
  error: string
  summaryRef?: Ref<HTMLElement>
  ticket?: FestivalTicket | null
  onRetryEmail?: () => void
}) {
  const needsPayment =
    payment === 'required' || payment === 'pending' || payment === 'not_requested'
  const canCheck =
    payment === 'unavailable'
  const registered = payment === 'confirmed' && !!ticket
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
          <h2 id="festival-saved-title">{registered ? 'You’re registered' : 'Complete your registration'}</h2>
          <p className="festival-help">{registered ? `${FESTIVAL_DATE} · ${FESTIVAL_VENUE}` : 'Confirmed award payment is required to register and attend.'}</p>
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
              : 'Dispatch after delivery is arranged'}
          </dd>
        </div>
        {(
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
        {registered && <div><dt>Ticket reference</dt><dd className="festival-ticket-reference">{ticket.id}</dd></div>}
      </dl>
      {payment === 'unavailable' && (
        <p className="festival-help">
          We couldn’t verify your award payment. Check again before paying.
        </p>
      )}
      {payment === 'pending' && (
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
        {registered && (
          <Button asChild className="festival-primary">
            <a href={FESTIVAL_TICKET_PATH} download><Download size={16} aria-hidden="true" />Download ticket</a>
          </Button>
        )}
        {needsPayment && (
          <Button asChild className="festival-primary">
            <Link href={FESTIVAL_PAYMENT_PATH}>
              {payment === 'pending'
                ? 'Review payment'
                : 'Get your award'}
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
          variant="outline"
          className="festival-secondary"
          onClick={onEdit}
          disabled={checking}
        >
          Edit details
        </Button>
      </div>
      {registered && <div className="festival-help" role="status">
        <p>{ticket.emailStatus === 'sent' ? 'Your ticket has been sent to your account email.'
          : ticket.emailStatus === 'preview' ? 'Local preview ticket. No email has been sent.'
          : ticket.emailStatus === 'failed' ? 'Your registration is confirmed, but the ticket email could not be sent. Download it now or retry the email.'
          : 'Your ticket email is pending. Download it now or check again.'}</p>
        {['failed', 'pending'].includes(ticket.emailStatus) && onRetryEmail && <button type="button" className="festival-text-action" onClick={onRetryEmail} disabled={checking}>{checking ? 'Sending ticket…' : 'Retry ticket email'}</button>}
      </div>}
      <p className="festival-help festival-summary__note">
        {interest.pickupRequested ? 'Your award and certificate will be prepared for festival collection. The team will confirm pickup arrangements.'
          : 'Your award and certificate will be dispatched once your delivery address and delivery arrangements are confirmed. Delivery charges are separate.'}
        {' '}Bring your ticket and photo ID. Admission requires your award payment to remain confirmed.
      </p>
    </section>
  )
}
