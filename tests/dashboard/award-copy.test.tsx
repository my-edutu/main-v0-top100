import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { AwardIntroduction } from '@/app/dashboard/_components/award-introduction'
import { AwardOptions } from '@/app/dashboard/_components/award-options'
import { AwardPaymentFaq } from '@/app/dashboard/_components/award-payment-faq'
import { AwardPaymentCard } from '@/app/dashboard/award-payment-card'
import { AwardPaymentSuccess } from '@/app/dashboard/award-payment-success'
import type { AwardPaymentView } from '@/lib/awards/payment'

const paymentView: AwardPaymentView = {
  status: 'unpaid',
  priceOptions: [
    { currency: 'NGN', amountMinor: 2_500_000, display: '₦25,000' },
    { currency: 'USD', amountMinor: 2_000, display: '$20' },
  ],
  currentAttempt: null,
  confirmedPayment: null,
  needsPayment: true,
}

describe('award payment copy', () => {
  it('leads with confirmed recognition and keeps prices off the overview', () => {
    const markup = renderToStaticMarkup(<AwardIntroduction />)

    expect(markup).toContain('Your impact has been recognized.')
    expect(markup).toContain('Recognition confirmed')
    expect(markup).toContain('physical Africa Future Leaders award')
    expect(markup).not.toContain('₦25,000')
    expect(markup).not.toContain('$20')
  })

  it('answers that payment does not determine recognition', () => {
    const markup = renderToStaticMarkup(<AwardPaymentFaq />)

    expect(markup).toContain('Does payment determine whether I receive the recognition?')
    expect(markup).toContain('Your Africa Future Leaders recognition has already been awarded.')
    expect(markup).toContain('What does the physical award fee cover?')
  })

  it('collects billing country and email before handing currency and final amount selection to checkout', () => {
    const markup = renderToStaticMarkup(<AwardPaymentCard view={paymentView} memberEmail="billing@example.com" />)

    expect(markup).toContain('Complete your physical award fee')
    expect(markup).toContain('physical award only')
    expect(markup).toContain('/illustrations/physical-award-emblem.svg')
    expect(markup).not.toContain('lucide-lock-keyhole')
    expect(markup).toContain('Your billing details')
    expect(markup).toContain('value="NG"')
    expect(markup).toContain('type="email"')
    expect(markup).toContain('value="billing@example.com"')
    expect(markup).not.toContain('href="https://checkout.bachs.io/pay/pl_f912ab207c61"')
    expect(markup).toContain('Proceed')
    expect(markup).toContain('Bachs will show available currencies and the final amount on the next screen.')
  })

  it('disables checkout when the provider is unavailable', () => {
    const markup = renderToStaticMarkup(<AwardPaymentCard view={{ ...paymentView, checkoutEnabled: false }} />)
    expect(markup).toContain('Payments are not open yet')
    expect(markup).toMatch(/<button[^>]*disabled/ )
    expect(markup).toMatch(/<fieldset[^>]*disabled/ )
    expect(markup).not.toContain('Proceed')
  })

  it('shows a full-screen green payment confirmation with a view-award action', () => {
    const success = renderToStaticMarkup(
      <AwardPaymentSuccess
        payment={{ currency: 'NGN', amountMinor: 2_500_000, paidAt: '2026-09-08T10:00:00.000Z' }}
      />,
    )
    const options = renderToStaticMarkup(<AwardOptions />)

    expect(success).toContain('/illustrations/award-payment-confirmed.svg')
    expect(success).toContain('View my award')
    expect(success).toContain('href="/dashboard/me/award/payment"')
    expect(success).toContain('min-h-[100dvh]')
    expect(options).toContain('bg-[#211C24]')
    expect(options).toContain('text-white')
  })
})
