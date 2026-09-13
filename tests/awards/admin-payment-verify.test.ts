import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(),
  verifyTransaction: vi.fn(),
  paidAmountMatches: vi.fn(),
}))

vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))
vi.mock('@/lib/payments/paystack', () => ({
  verifyTransaction: mocks.verifyTransaction,
  paidAmountMatches: mocks.paidAmountMatches,
}))

import { POST } from '@/app/api/admin/awards/verify-payment/route'

function request(body: Record<string, unknown>) {
  return new NextRequest('https://www.top100afl.com/api/admin/awards/verify-payment', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function makeClient(order: Record<string, unknown>, attempts: Record<string, unknown>[] = []) {
  return {
    from(table: string) {
      if (table === 'award_orders') {
        return {
          select: () => ({
            eq: () => ({ maybeSingle: async () => ({ data: order, error: null }) }),
          }),
        }
      }
      const chain: any = {
        eq: () => chain,
        then: (resolve: (value: unknown) => unknown) => Promise.resolve({ data: attempts, error: null }).then(resolve),
      }
      return { select: () => chain }
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-1' }, profile: { role: 'admin' } })
})

describe('legacy Paystack verification guard', () => {
  it('rejects an order without a stored Paystack reference', async () => {
    mocks.createAdminClient.mockReturnValue(makeClient({ id: 'order-1', status: 'awaiting_payment' }))

    const response = await POST(request({ orderId: 'order-1' }))

    expect(response.status).toBe(400)
    expect(mocks.verifyTransaction).not.toHaveBeenCalled()
  })

  it('rejects a recorded Bachs success even when an old Paystack reference remains', async () => {
    mocks.createAdminClient.mockReturnValue(
      makeClient(
        {
          id: 'order-1',
          status: 'quoted',
          paystack_reference: 'old-paystack-reference',
          award_payment_status: 'pending',
        },
        [{ id: 'attempt-1', provider: 'bachs', status: 'succeeded' }],
      ),
    )

    const response = await POST(request({ orderId: 'order-1' }))

    expect(response.status).toBe(409)
    expect(mocks.verifyTransaction).not.toHaveBeenCalled()
  })

  it('rejects provider switching before loading any order', async () => {
    const response = await POST(request({ orderId: 'order-1', provider: 'bachs' }))

    expect(response.status).toBe(400)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
    expect(mocks.verifyTransaction).not.toHaveBeenCalled()
  })
})
