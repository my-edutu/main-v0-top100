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
  expect((await GET(new Request('http://localhost/api/member/programme-interest'))).status).toBe(401)
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


describe('community application persistence', () => {
 const applicant = {
  kind: 'community', activity_id: null, consent: true,
  community_details: { version: 2, answers: {
   full_name: 'Test Member', email: 'member@example.com', phone: '+234 801 234 5678',
   country_code: 'NG', bio: 'I run a community mentoring programme.',
   session_idea: 'Designing a mentorship programme', motivation: 'Help new mentors get started.',
   confirmation: true,
  } },
 }
 const saved = { id: 'saved-interest', kind: 'community', activity_id: null }

 beforeEach(() => {
  user.mockReset().mockResolvedValue({ id: 'member' })
  client.mockReset()
 })

 it('loads only the signed-in member’s application independently of open programmes', async () => {
  const byKind = vi.fn().mockResolvedValue({ data: [saved] })
  const byMember = vi.fn().mockReturnValue({ eq: byKind })
  const from = vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: byMember }) })
  client.mockReturnValue({ from })

  const result = await GET(new Request('http://localhost/api/member/programme-interest?scope=community'))

  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ interests: [saved] })
  expect(from).toHaveBeenCalledExactlyOnceWith('programme_manager_interests')
  expect(byMember).toHaveBeenCalledWith('member_id', 'member')
  expect(byKind).toHaveBeenCalledWith('kind', 'community')
 })

 it('stores the validated answers with the authenticated member id', async () => {
  const insert = vi.fn().mockReturnValue({ select: () => ({ single: async () => ({ data: saved }) }) })
  client.mockReturnValue({ from: () => ({ insert }) })
  const result = await POST(request('POST', { ...applicant, member_id: 'someone-else' }))

  expect(result.status).toBe(201)
  expect(insert).toHaveBeenCalledWith(expect.objectContaining({
   member_id: 'member',
   community_details: expect.objectContaining({
    version: 2, answers: expect.objectContaining(applicant.community_details.answers),
   }),
  }))
 })

 it('returns the existing application when a submission is retried', async () => {
  const lookup = { eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn().mockResolvedValue({ data: saved }) }
  lookup.eq.mockReturnValue(lookup)
  lookup.is.mockReturnValue(lookup)
  client.mockReturnValue({ from: () => ({
   insert: () => ({ select: () => ({ single: async () => ({ error: { code: '23505' } }) }) }),
   select: () => lookup,
  }) })
  const result = await POST(request('POST', applicant))

  expect(result.status).toBe(200)
  expect(await result.json()).toEqual({ interest: saved, alreadyRecorded: true })
  expect(lookup.eq).toHaveBeenCalledWith('member_id', 'member')
 })

 it('tells the form which answer failed validation', async () => {
  const community_details = { ...applicant.community_details, answers: { ...applicant.community_details.answers, phone: '123' } }
  const result = await POST(request('POST', { ...applicant, community_details }))

  expect(result.status).toBe(400)
  expect(await result.json()).toMatchObject({ field: 'phone' })
  expect(client).not.toHaveBeenCalled()
 })
})
