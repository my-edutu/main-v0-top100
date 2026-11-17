import { afterEach, describe, expect, it, vi } from 'vitest'
import { listCampaigns } from '@/lib/admin-email/listmonk'

afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })
describe('private Listmonk client', () => {
  it('fails closed when its private credentials are missing', async () => {
    vi.stubEnv('LISTMONK_URL', '')
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher)
    await expect(listCampaigns()).rejects.toThrow('Email service is not configured')
    expect(fetcher).not.toHaveBeenCalled()
  })
  it('reads campaigns with server-only authentication and no cache', async () => {
    vi.stubEnv('LISTMONK_URL', 'http://listmonk:9000')
    vi.stubEnv('LISTMONK_API_USER', 'integration')
    vi.stubEnv('LISTMONK_API_TOKEN', 'test-secret')
    const fetcher = vi.fn().mockResolvedValue(Response.json({ data: { results: [] } })); vi.stubGlobal('fetch', fetcher)
    await expect(listCampaigns()).resolves.toEqual({ results: [] })
    expect(fetcher).toHaveBeenCalledWith('http://listmonk:9000/api/campaigns?page=1&per_page=50', expect.objectContaining({ cache: 'no-store', headers: expect.objectContaining({ Authorization: `Basic ${Buffer.from('integration:test-secret').toString('base64')}` }) }))
  })
  it('does not expose upstream error bodies', async () => {
    vi.stubEnv('LISTMONK_URL', 'http://listmonk:9000'); vi.stubEnv('LISTMONK_API_USER', 'integration'); vi.stubEnv('LISTMONK_API_TOKEN', 'test-secret')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('secret internal detail', { status: 500 })))
    await expect(listCampaigns()).rejects.toThrow('Email service is unavailable')
  })
})
it('loads subscribers without granting the integration raw SQL access', async () => {
  vi.stubEnv('LISTMONK_URL', 'http://listmonk:9000'); vi.stubEnv('LISTMONK_API_USER', 'integration'); vi.stubEnv('LISTMONK_API_TOKEN', 'test-secret')
  const fetcher = vi.fn().mockResolvedValue(Response.json({ data: { results: [{ id: 1, uuid: 'u', email: 'person@example.org', name: 'Person', status: 'enabled', lists: [] }], total: 1 } })); vi.stubGlobal('fetch', fetcher)
  const { listSubscribers } = await import('@/lib/admin-email/listmonk')
  expect(await listSubscribers()).toHaveLength(1)
  expect(String(fetcher.mock.calls[0][0])).not.toContain('query=')
})
