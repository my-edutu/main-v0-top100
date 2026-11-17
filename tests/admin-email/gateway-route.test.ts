import { afterEach, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({ deliver: vi.fn() }))
vi.mock('@/lib/admin-email/gateway', () => ({ deliverGatewayMessage: mocks.deliver }))
vi.mock('@/lib/admin-email/gateway-server', () => ({ gatewayDependencies: vi.fn(() => ({})) }))
import { POST } from '@/app/api/internal/email-gateway/route'
const request = (auth?: string) => new NextRequest('https://top100afl.com/api/internal/email-gateway', { method: 'POST', headers: { 'content-type': 'application/json', ...(auth ? { authorization: auth } : {}) }, body: '{}' })
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks() })
it('fails closed if credentials are not set or the caller is unauthenticated', async () => {
  vi.stubEnv('LISTMONK_GATEWAY_USER', ''); vi.stubEnv('LISTMONK_GATEWAY_PASSWORD', '')
  expect((await POST(request())).status).toBe(503)
  vi.stubEnv('LISTMONK_GATEWAY_USER', 'gateway'); vi.stubEnv('LISTMONK_GATEWAY_PASSWORD', 'secret')
  expect((await POST(request('Basic d3Jvbmc6d3Jvbmc='))).status).toBe(401)
  expect(mocks.deliver).not.toHaveBeenCalled()
})
it('passes authenticated requests to the fenced gateway', async () => {
  vi.stubEnv('LISTMONK_GATEWAY_USER', 'gateway'); vi.stubEnv('LISTMONK_GATEWAY_PASSWORD', 'secret')
  mocks.deliver.mockResolvedValue({ status: 200 })
  expect((await POST(request(`Basic ${Buffer.from('gateway:secret').toString('base64')}`))).status).toBe(200)
  expect(mocks.deliver).toHaveBeenCalledOnce()
})
