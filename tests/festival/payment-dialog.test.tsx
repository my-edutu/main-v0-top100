import { renderToStaticMarkup } from 'react-dom/server'
import { expect, it } from 'vitest'
import { FestivalPaymentResult } from '@/app/dashboard/_components/festival-payment-dialog'

it('shows confirmation only for verified payment', () => {
  const html = renderToStaticMarkup(<FestivalPaymentResult payment="confirmed" checking={false} error="" />)
  expect(html).toContain('Payment confirmed')
  expect(html).toContain('data-payment-state="confirmed"')
})
it.each([
  ['pending', 'Verification in progress'],
  ['required', 'No confirmed payment yet'],
  ['unavailable', 'Unable to verify payment'],
] as const)('shows the actual %s result without claiming confirmation', (payment, title) => {
  const html = renderToStaticMarkup(<FestivalPaymentResult payment={payment} checking={false} error="" />)
  expect(html).toContain(title)
  expect(html).not.toContain('data-payment-state="confirmed"')
})
it('shows checking while the request runs rather than an earlier confirmed state', () => {
  const html = renderToStaticMarkup(<FestivalPaymentResult payment="confirmed" checking error="" />)
  expect(html).toContain('Checking your payment')
  expect(html).not.toContain('Payment confirmed')
})
it('shows a failed check without keeping a stale confirmation', () => {
  const html = renderToStaticMarkup(<FestivalPaymentResult payment="confirmed" checking={false} error="Please try again." />)
  expect(html).toContain('Unable to verify payment')
  expect(html).toContain('Please try again.')
  expect(html).not.toContain('Payment confirmed')
})
