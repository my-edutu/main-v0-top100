'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowRight, FileBadge } from 'lucide-react'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { isHostedCheckoutUrl } from '@/lib/payments/bachs/payment-links'
import { canIssueRecommendation, FREE_RECOMMENDATION_LIMIT, RECOMMENDATION_PACK_SIZE, type RecommendationAccess } from '@/lib/award-letters/recommendation-payment'

async function paymentRequest(action: 'checkout' | 'check', demo = false) {
  const path = demo ? '/api/member/recommendation-letters?demoPack=true' : '/api/member/recommendation-letters/payment'
  const response = await fetch(path, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.message || 'Payment status is unavailable.')
  return data as { access: RecommendationAccess; checkoutUrl?: string }
}

export function RecommendationUpgrade({ access, onAccess, allowCheckout }: {
  allowCheckout: boolean
  access: RecommendationAccess | null
  onAccess: (access: RecommendationAccess) => void
}) {
  const [checkoutPrompt, setCheckoutPrompt] = useState(false)
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!allowCheckout) return
    const url = new URL(window.location.href)
    const outcome = url.searchParams.get('pack')
    if (outcome === 'cancelled') {
      toast.info('You left checkout. Check payment status before paying again.', { id: 'recommendation-checkout-cancelled' })
      url.searchParams.delete('pack')
      window.history.replaceState(null, '', url)
      return
    }
    if (outcome !== 'return') return
    let active = true

    async function verifyReturn() {
      setBusy(true)
      try {
        const result = await paymentRequest('check')
        if (!active) return
        onAccess(result.access)
        if (result.access.credits > 0) toast.success('Payment confirmed. Your recommendation credits are ready.')
        else setNote('Payment is not confirmed yet. Check again in a moment.')
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not check payment.')
      } finally {
        if (active) {
          setBusy(false)
          url.searchParams.delete('pack')
          url.searchParams.delete('checkout_id')
          window.history.replaceState(null, '', url)
        }
      }
    }

    void verifyReturn()
    return () => { active = false }
  }, [allowCheckout, onAccess])

  async function handlePayment(action: 'checkout' | 'check') {
    if (!access || !allowCheckout) return
    setBusy(true)
    setError('')
    setNote('')
    try {
      const result = await paymentRequest(action, access.demo)
      onAccess(result.access)
      if (result.checkoutUrl) {
        if (!isHostedCheckoutUrl(result.checkoutUrl)) throw new Error('The secure checkout link was invalid. Please try again.')
        window.location.assign(result.checkoutUrl)
        return
      }
      setNote(result.access.award === 'confirmed' ? '' : result.access.credits > 0 ? 'Your credits are ready.' : result.access.checkoutPending
        ? 'Payment is not confirmed yet. You can check again or resume your checkout.'
        : 'There is no payment awaiting confirmation.')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open checkout.')
    } finally {
      setBusy(false)
    }
  }

  const included = access?.award === 'confirmed'
  const allowed = access && canIssueRecommendation(access)
  const pendingAward = access?.award === 'pending'
  const unavailable = access?.award === 'unavailable'
  const pendingCheckout = access?.checkoutPending

  return (
    <div className="mt-5">
      {!access ? <p className="text-sm text-stone-600" role="status">Checking recommendation access…</p>
        : allowed ? <p className="rounded-xl bg-[#FFF8E7] px-4 py-3 text-sm font-semibold text-[#654800]">
          {included ? 'Recommendations are included with your paid award.'
            : access.freeRemaining > 0
              ? `${access.freeRemaining} of ${FREE_RECOMMENDATION_LIMIT} free recommendations left`
              : `${access.credits} recommendation ${access.credits === 1 ? 'credit' : 'credits'} remaining`}
        </p> : !allowCheckout ? (
          <p className="rounded-xl bg-[#FFF8E7] px-4 py-3 text-sm font-semibold text-[#654800]">
            {pendingAward || unavailable
              ? 'We couldn’t verify your recommendation access right now. Check again later.'
              : 'You have no recommendation credits available.'}
          </p>
        ) : (
          <section aria-labelledby="recommendation-upgrade" className="rounded-[20px] border border-[#EBD9A4] bg-[#FFF6DD] p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[#FFE8A3] text-[#654800]"><FileBadge size={20} aria-hidden="true" /></span>
              <div>
                <h2 id="recommendation-upgrade" className="text-lg font-semibold">You’ve used your free recommendations</h2>
                <p className="mt-1 text-sm leading-6 text-stone-700">Your first three recommendations are free. Get five more for a one-time payment of $5 USD, or get recommendations included when your award payment is confirmed.</p>
              </div>
            </div>
            {pendingAward && <p className="mt-3 text-sm text-stone-700">Your award payment is still being verified. Check its status to see if recommendations are included.</p>}
            {unavailable && <p className="mt-3 text-sm text-stone-700">We couldn’t verify your award payment. Check again before buying a pack.</p>}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {(access.award === 'required' || pendingCheckout) && (
                <button type="button" disabled={busy} onClick={() => setCheckoutPrompt(true)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#FFDF45] px-4 py-2 text-sm font-semibold text-stone-950 hover:bg-[#FFD52A] focus-visible:outline-2 focus-visible:outline-orange-700 disabled:opacity-60">
                  {busy ? 'Please wait…' : pendingCheckout ? 'Resume checkout' : access.demo ? 'Try a $5 pack (demo)' : 'Buy 5 letters for $5'}
                  <ArrowRight size={16} aria-hidden="true" />
                </button>
              )}
              <Link href="/dashboard/me/award/payment" className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-semibold text-[#813307] hover:underline">
                {pendingAward || unavailable ? 'Check award payment' : 'Pay for your award'}
              </Link>
              {(pendingCheckout || unavailable || pendingAward) && <button type="button" disabled={busy} onClick={() => void handlePayment('check')} className="min-h-11 px-2 text-sm font-semibold underline disabled:opacity-60">Check payment status</button>}
            </div>
          </section>
        )}
      <AlertDialog open={allowCheckout && checkoutPrompt} onOpenChange={setCheckoutPrompt}>
        <AlertDialogContent className="w-[calc(100%-2rem)] rounded-2xl bg-white text-stone-950">
          <AlertDialogHeader>
            <AlertDialogTitle>Get {RECOMMENDATION_PACK_SIZE} more recommendations</AlertDialogTitle>
            <AlertDialogDescription>
              You’ve used your {FREE_RECOMMENDATION_LIMIT} free letters. This is a one-time $5 USD purchase for five more.
              A credit is used only when you finalize a new letter. Bachs shows your payment options and total before you pay.
              {access?.demo && ' In this local demo, no payment is collected.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction disabled={busy} onClick={() => void handlePayment('checkout')}>
              {access?.demo ? 'Activate demo credits' : pendingCheckout ? 'Resume Bachs checkout' : 'Continue to Bachs'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {note && <p className="mt-2 text-sm text-stone-700" role="status">{note}</p>}
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  )
}
