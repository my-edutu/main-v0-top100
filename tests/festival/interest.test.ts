import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({
  user: vi.fn(),
  payment: vi.fn(),
  db: vi.fn(),
  rate: vi.fn(),
  admin: vi.fn(),
}))
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: mocks.user }))
vi.mock('@/lib/awards/payment-server', () => ({
  getAwardPaymentView: mocks.payment,
}))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.db }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.admin }))
vi.mock('@/lib/rate-limit', () => ({
  checkRateLimit: mocks.rate,
  RATE_LIMITS: { AUTH: {} },
  createRateLimitResponse: () => new Response('{}', { status: 429 }),
}))

import {
  festivalInterestSchema,
  pickupPaymentState,
} from '@/lib/festival/interest'
import { GET, POST } from '@/app/api/member/festival-interest/route'
import { GET as adminGET } from '@/app/api/admin/festival-interest/route'

const input = {
  fullName: 'Amara Okafor',
  phone: '+2348031234567',
  pickupRequested: true,
}
const row = {
  full_name: input.fullName,
  phone: input.phone,
  pickup_requested: true,
  updated_at: '2026-10-31T00:00:00Z',
}
let chain: Record<string, ReturnType<typeof vi.fn>>
beforeEach(() => {
  vi.resetAllMocks()
  mocks.user.mockResolvedValue({ id: 'member-1' })
  mocks.rate.mockResolvedValue({ success: true })
  mocks.payment.mockResolvedValue({ status: 'unpaid', confirmedPayment: null })
  chain = Object.fromEntries(
    ['select', 'eq', 'upsert', 'order', 'range'].map((key) => [
      key,
      vi.fn().mockReturnThis(),
    ]),
  )
  chain.maybeSingle = vi.fn().mockResolvedValue({ data: row, error: null })
  chain.single = vi.fn().mockResolvedValue({ data: row, error: null })
  mocks.db.mockReturnValue({ from: vi.fn().mockReturnValue(chain) })
})
const request = (body: unknown) =>
  new NextRequest('https://top100afl.com/api/member/festival-interest', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

describe('festival interest contract', () => {
  it('normalizes names and international phone numbers', () => {
    expect(
      festivalInterestSchema.parse({
        ...input,
        fullName: '  Amara Okafor ',
        phone: '+234 803 123 4567',
      }),
    ).toEqual(input)
  })
  it.each([
    { ...input, fullName: '' },
    { ...input, phone: '08031234567' },
    { ...input, phone: '+123' },
    { ...input, pickupRequested: 'yes' },
    { ...input, paymentConfirmed: true },
    { ...input, memberId: 'someone-else' },
  ])('rejects incomplete fields and client authority: %j', (body) => {
    expect(festivalInterestSchema.safeParse(body).success).toBe(false)
  })
  it('requires verified current payment and handles pending/refunded state', () => {
    expect(
      pickupPaymentState({
        status: 'paid',
        confirmedPayment: { currency: 'NGN', amountMinor: 1, paidAt: 'now' },
      }),
    ).toBe('confirmed')
    expect(pickupPaymentState({ status: 'paid', confirmedPayment: null })).toBe(
      'unavailable',
    )
    expect(
      pickupPaymentState({ status: 'pending', confirmedPayment: null }),
    ).toBe('pending')
    expect(
      pickupPaymentState({ status: 'refunded', confirmedPayment: null }),
    ).toBe('required')
  })
})

describe('member festival endpoint', () => {
  it('requires authentication for read and save', async () => {
    mocks.user.mockResolvedValue(null)
    expect((await GET()).status).toBe(401)
    expect((await POST(request(input))).status).toBe(401)
    expect(mocks.db).not.toHaveBeenCalled()
  })
  it('only reads the current member and disables private caching', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(chain.eq).toHaveBeenCalledWith('member_id', 'member-1')
    expect(mocks.payment).toHaveBeenCalledWith('member-1')
    expect(await response.json()).toMatchObject({
      interest: input,
      payment: 'required',
    })
  })
  it('saves pickup intent before returning the payment requirement, upserting only its own member', async () => {
    const response = await POST(request(input))
    expect(response.status).toBe(200)
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        member_id: 'member-1',
        festival_key: 'afl-festival-2026',
        full_name: input.fullName,
        phone: input.phone,
        pickup_requested: true,
      }),
      { onConflict: 'festival_key,member_id' },
    )
    expect(await response.json()).toMatchObject({
      interest: input,
      payment: 'required',
    })
  })
  it('saves attendance when payment verification is unavailable without telling a member to pay again', async () => {
    mocks.payment.mockRejectedValue(new Error('private provider error'))
    const response = await POST(request(input))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({
      interest: input,
      payment: 'unavailable',
    })
  })
  it('does not require a payment lookup for attendance without pickup', async () => {
    chain.single.mockResolvedValue({
      data: { ...row, pickup_requested: false },
      error: null,
    })
    const response = await POST(request({ ...input, pickupRequested: false }))
    expect(await response.json()).toMatchObject({ payment: 'not_requested' })
    expect(mocks.payment).not.toHaveBeenCalled()
  })
  it('rejects forged payment flags before saving', async () => {
    expect((await POST(request({ ...input, paid: true }))).status).toBe(400)
    expect(chain.upsert).not.toHaveBeenCalled()
  })
  it('returns an unavailable state for database errors without leaking details', async () => {
    chain.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'service_role secret' },
    })
    const response = await GET()
    expect(response.status).toBe(503)
    expect(await response.text()).not.toContain('service_role')
  })
  it('does not say saved if persistence fails', async () => {
    chain.single.mockResolvedValue({
      data: null,
      error: { message: 'constraint' },
    })
    expect((await POST(request(input))).status).toBe(503)
  })
  it('rate limits saves before database access', async () => {
    mocks.rate.mockResolvedValue({ success: false })
    expect((await POST(request(input))).status).toBe(429)
    expect(mocks.db).not.toHaveBeenCalled()
  })
})

describe('staff interest list', () => {
  it('requires the authoritative admin guard', async () => {
    mocks.admin.mockResolvedValue({
      error: new Response('{}', { status: 403 }),
    })
    expect(
      (
        await adminGET(
          new NextRequest('https://top100afl.com/api/admin/festival-interest'),
        )
      ).status,
    ).toBe(403)
    expect(mocks.db).not.toHaveBeenCalled()
  })
  it('paginates and scopes to the current festival', async () => {
    mocks.admin.mockResolvedValue({ user: { id: 'admin-1' } })
    chain.range.mockResolvedValue({
      data: [{ ...row, member_id: 'member-1' }],
      count: 26,
      error: null,
    })
    const response = await adminGET(
      new NextRequest(
        'https://top100afl.com/api/admin/festival-interest?page=2',
      ),
    )
    expect(response.status).toBe(200)
    expect(chain.eq).toHaveBeenCalledWith('festival_key', 'afl-festival-2026')
    expect(chain.range).toHaveBeenCalledWith(25, 49)
    expect(response.headers.get('Cache-Control')).toContain('no-store')
    expect(await response.json()).toMatchObject({ total: 26, page: 2 })
  })
})
