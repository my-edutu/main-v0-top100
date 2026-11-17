import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}))

vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => ({ from: mocks.from }) }))

import { POST } from '@/app/api/admin/awards/coupons/route'

function request(expiresAt: string) {
  return new NextRequest('https://top100afl.com/api/admin/awards/coupons', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ expiresAt }),
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
  mocks.from.mockReturnValue({ insert: mocks.insert })
  mocks.insert.mockResolvedValue({ error: null })
})

describe('admin award coupon generation', () => {
  it('requires admin access before creating a campaign', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: NextResponse.json({}, { status: 403 }) })
    expect((await POST(request('2099-11-07T10:30'))).status).toBe(403)
    expect(mocks.insert).not.toHaveBeenCalled()
  })

  it.each(['2020-01-01T00:00', '2099-02-30T10:00', '2099-01-01T10:00Z'])(
    'rejects an invalid or elapsed Lagos expiry %s',
    async expiresAt => {
      expect((await POST(request(expiresAt))).status).toBe(400)
      expect(mocks.insert).not.toHaveBeenCalled()
    },
  )

  it('returns a shareable code and stores only its digest with the Lagos expiry', async () => {
    const response = await POST(request('2099-11-07T10:30'))
    expect(response.status).toBe(201)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const result = await response.json()
    expect(result.code).toMatch(/^AFL-[A-F0-9]{16}$/)
    expect(result.expiresAt).toBe('2099-11-07T09:30:00.000Z')
    expect(mocks.from).toHaveBeenCalledWith('award_coupons')
    expect(mocks.insert).toHaveBeenCalledWith({
      code_digest: createHash('sha256').update(result.code).digest('hex'),
      enabled: true,
      allow_all_awardees: true,
      expires_at: result.expiresAt,
    })
  })
})
