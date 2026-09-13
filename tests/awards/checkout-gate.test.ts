import { NextRequest } from 'next/server'
import { afterEach, describe, expect, it, vi } from 'vitest'

const createAdminClient = vi.hoisted(() => vi.fn())

vi.mock('@/lib/auth-server', () => ({
  getCurrentUser: async () => ({ id: 'member-1', email: 'member@example.com' }),
}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient }))

import { POST } from '@/app/api/member/award/checkout/route'

describe('legacy award checkout cutover guard', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    createAdminClient.mockReset()
  })

  it('returns gone without touching auth, order, or a payment provider', async () => {
    vi.stubEnv('AWARD_CHECKOUT_ENABLED', '')
    vi.stubEnv('PAYSTACK_SECRET_KEY', '')
    createAdminClient.mockImplementation(() => {
      throw new Error('database must not be reached')
    })

    const response = await POST(
      new NextRequest('https://top100afl.com/api/member/award/checkout', {
        method: 'POST',
      }),
    )

    expect(response.status).toBe(410)
    await expect(response.json()).resolves.toEqual({
      message: 'This checkout has moved. Refresh the dashboard to pay with Bachs.',
    })
    expect(createAdminClient).not.toHaveBeenCalled()
  })
})
