'use client'

import type { RefObject } from 'react'
import { CheckCircle2, Clock3, CircleAlert, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { FestivalPaymentState } from '@/lib/festival/interest'

const results = {
  confirmed: { title: 'Payment confirmed', description: 'Your physical award payment has been verified. You can continue with your festival registration.', icon: CheckCircle2 },
  pending: { title: 'Verification in progress', description: 'Your award payment is still being verified. Please check again before making another payment.', icon: Clock3 },
  required: { title: 'No confirmed payment yet', description: 'We haven’t found a confirmed award payment for your account. If you just paid, wait a moment and check again.', icon: CircleAlert },
  unavailable: { title: 'Unable to verify payment', description: 'We couldn’t check your payment right now. Please try again before making another payment.', icon: CircleAlert },
  not_requested: { title: 'Payment not checked yet', description: 'Check your award payment status before making another payment.', icon: CircleAlert },
}

export function FestivalPaymentResult({ payment, checking, error }: { payment: FestivalPaymentState; checking: boolean; error: string }) {
  const state = checking ? 'checking' : error ? 'unavailable' : payment
  const result = state === 'checking'
    ? { title: 'Checking your payment', description: 'We’re verifying your latest award payment status.', icon: LoaderCircle }
    : results[state]
  const Icon = result.icon
  return <div className="festival-payment-result" data-payment-state={state} role="status" aria-live="polite">
    <span className="festival-payment-result__icon" aria-hidden="true"><Icon size={30} className={checking ? 'animate-spin motion-reduce:animate-none' : undefined} /></span>
    <h2>{result.title}</h2>
    <p id="festival-payment-description">{error && !checking ? error : result.description}</p>
  </div>
}

export function FestivalPaymentDialog({ open, onOpenChange, payment, checking, error, onRetry, returnFocusRef, fallbackFocusRef }: {
  open: boolean; onOpenChange: (open: boolean) => void; payment: FestivalPaymentState; checking: boolean; error: string;
  onRetry: () => void; returnFocusRef: RefObject<HTMLElement | null>;
  fallbackFocusRef: RefObject<HTMLElement | null>;
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="festival-payment-dialog" overlayClassName="festival-payment-overlay" aria-describedby="festival-payment-description" onCloseAutoFocus={event => {
      event.preventDefault()
      const trigger = returnFocusRef.current
      if (trigger?.isConnected && !trigger.matches(':disabled')) trigger.focus()
      else fallbackFocusRef.current?.focus()
    }}>
      <DialogTitle className="sr-only">Award payment status</DialogTitle>
      <FestivalPaymentResult payment={payment} checking={checking} error={error} />
      <div className="festival-payment-dialog__actions">
        {!checking && (payment !== 'confirmed' || error) && <Button variant="outline" className="festival-secondary" onClick={onRetry}>Check again</Button>}
        <Button className="festival-primary" onClick={() => onOpenChange(false)}>{checking ? 'Close' : 'Done'}</Button>
      </div>
    </DialogContent>
  </Dialog>
}
