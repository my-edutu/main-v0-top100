import { beforeEach, describe, expect, it, vi } from 'vitest'

const { getCurrentUser, getAwardPaymentView } = vi.hoisted(() => ({
  getCurrentUser: vi.fn(),
  getAwardPaymentView: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ host: 'localhost:3000' }),
  cookies: async () => ({
    get: (name: string) =>
      name === 'top100-local-dashboard-demo'
        ? { value: 'top100-local-dashboard-demo-v1' }
        : undefined,
  }),
}))

vi.mock('next/navigation', () => ({ redirect: vi.fn() }))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser }))
vi.mock('@/lib/awards/payment-server', () => ({ getAwardPaymentView }))

import { requireConfirmedAwardAccess, requireSignedInAwardeeAccess } from '@/lib/awards/access-server'

describe('requireConfirmedAwardAccess', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development')
    getCurrentUser.mockReset()
    getAwardPaymentView.mockReset()
  })

  it('opens the cover for a signed-in production member without reading payment status', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    getCurrentUser.mockResolvedValue({ id: 'unpaid-member' })
    await expect(requireSignedInAwardeeAccess('/dashboard/me/portfolio-cover')).resolves.toBeUndefined()
    expect(getCurrentUser).toHaveBeenCalled()
    expect(getAwardPaymentView).not.toHaveBeenCalled()
  })

  it('lets a valid local demo session proceed without waiting on Supabase auth', async () => {
    await expect(requireConfirmedAwardAccess('/dashboard/me/award/complete')).resolves.toBeUndefined()

    expect(getCurrentUser).not.toHaveBeenCalled()
    expect(getAwardPaymentView).not.toHaveBeenCalled()
  })
})
