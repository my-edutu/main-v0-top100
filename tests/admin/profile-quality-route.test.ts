import { beforeEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const { requireAdmin, loadProfileQuality, checkProfileLink } = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  loadProfileQuality: vi.fn(),
  checkProfileLink: vi.fn(),
}))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin }))
vi.mock('@/lib/admin/profile-quality-server', () => ({ loadProfileQuality }))
vi.mock('@/lib/admin/profile-link-probe', () => ({ checkProfileLink }))
import { POST } from '@/app/api/admin/awardees/quality/links/route'

const request = (body: unknown) => new NextRequest('https://top100afl.com/api/admin/awardees/quality/links', {
  method: 'POST',
  body: JSON.stringify(body),
})
const id = '00000000-0000-4000-8000-000000000001'
beforeEach(() => vi.resetAllMocks())

it('rejects unauthenticated scans before reading profile data', async () => {
  requireAdmin.mockResolvedValue({ error: new Response(null, { status: 401 }) })
  expect((await POST(request({ ids: [id] }))).status).toBe(401)
  expect(loadProfileQuality).not.toHaveBeenCalled()
  expect(checkProfileLink).not.toHaveBeenCalled()
})

it('checks stored public-profile links rather than accepting client URLs', async () => {
  requireAdmin.mockResolvedValue({ user: { id: 'admin' } })
  loadProfileQuality.mockResolvedValue([])
  const response = await POST(request({ ids: [id], url: 'http://169.254.169.254/latest' }))
  expect(response.status).toBe(200)
  expect(loadProfileQuality).toHaveBeenCalledWith([id])
  expect(checkProfileLink).not.toHaveBeenCalled()
  expect(await response.json()).toEqual({ results: {} })
})
