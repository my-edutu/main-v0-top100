import { expect, it } from 'vitest'
import { androidCheckoutRejection, paymentViewForDistribution } from '@/lib/play-distribution'

const play = new Request('https://www.top100afl.com/api/member/magazine/payment', {
  headers: { cookie: 'session=abc; top100-play=1' },
})
const web = new Request(play.url, { headers: { cookie: 'other=top100-play=1' } })

it('blocks Play checkout and leaves regular web requests alone', async () => {
  const response = androidCheckoutRejection(play)
  expect(response?.status).toBe(403)
  expect(response?.headers.get('cache-control')).toBe('private, no-store')
  expect(await response?.json()).toEqual({ message: 'Checkout is unavailable in this app.' })
  expect(androidCheckoutRejection(web)).toBeNull()
})

it('removes resume links without changing the paid entitlement or payment state', () => {
  const view = {
    applicationEligible: true,
    orderStatus: 'paid',
    currentAttempt: { id: 'attempt', status: 'open', checkoutUrl: 'https://checkout.example.test/' },
  }
  expect(paymentViewForDistribution(view, true, play)).toEqual({
    applicationEligible: true,
    orderStatus: 'paid',
    currentAttempt: { id: 'attempt', status: 'open' },
    checkoutEnabled: false,
    checkoutInAppUnavailable: true,
  })
  expect(paymentViewForDistribution(view, true, web)).toMatchObject({ ...view, checkoutEnabled: true })
  expect(view.currentAttempt.checkoutUrl).toContain('checkout.example.test')
})
