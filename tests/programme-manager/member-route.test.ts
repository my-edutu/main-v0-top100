import { beforeEach, describe, expect, it, vi } from 'vitest'
const user = vi.fn(); const client = vi.fn()
vi.mock('@/lib/auth-server', () => ({ getCurrentUser: () => user() }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: () => client() }))
vi.mock('@/lib/rate-limit', () => ({ checkRateLimit: async () => ({ success:true }), RATE_LIMITS:{ AUTH:{} }, createRateLimitResponse: vi.fn() }))
import { GET, POST, DELETE } from '@/app/api/member/programme-interest/route'
const request = (method:string, body:unknown) => new Request('http://localhost/api/member/programme-interest', { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) })
describe('member interest routes', () => {
 beforeEach(() => { user.mockReset(); client.mockReset() })
 it('requires a session before reading or changing interests', async () => {
  user.mockResolvedValue(null)
  expect((await GET()).status).toBe(401)
  expect((await POST(request('POST',{}))).status).toBe(401)
  expect((await DELETE(request('DELETE',{}))).status).toBe(401)
  expect(client).not.toHaveBeenCalled()
 })
 it('rejects missing consent without touching the database', async () => {
  user.mockResolvedValue({id:'member'})
  expect((await POST(request('POST',{kind:'mentor', activity_id:null, consent:false}))).status).toBe(400)
  expect(client).not.toHaveBeenCalled()
 })
})
