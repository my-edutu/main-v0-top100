import { afterEach, expect, it, vi } from 'vitest'
import { startAwardCheckout } from '@/lib/awards'

afterEach(() => vi.unstubAllGlobals())

it('preserves an expired quote response so checkout can return to address confirmation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    message: 'Your delivery quote expired.', expired: true,
  }, { status: 409 })))
  await expect(startAwardCheckout()).rejects.toMatchObject({
    message: 'Your delivery quote expired.', quoteExpired: true, status: 409,
  })
})

it('does not treat a payment provider error as an expired quote', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    message: 'Could not start the payment.',
  }, { status: 502 })))
  await expect(startAwardCheckout()).rejects.toMatchObject({
    quoteExpired: false, status: 502,
  })
})

it('returns the checkout URL on success', async () => {
  const result = { authorizationUrl: 'https://checkout.paystack.com/test', reference: 'award-test' }
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(result)))
  await expect(startAwardCheckout()).resolves.toEqual(result)
})
