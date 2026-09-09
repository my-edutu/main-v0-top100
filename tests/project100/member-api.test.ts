import { NextRequest } from 'next/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  session: vi.fn(),
  load: vi.fn(),
  save: vi.fn(),
  submit: vi.fn(),
}))

vi.mock('@/lib/auth-server', () => ({ getServerSession: mocks.session }))
vi.mock('@/lib/project100/server', () => ({
  loadMemberProject100: mocks.load,
  saveMemberProject100Draft: mocks.save,
  submitMemberProject100: mocks.submit,
}))

import { GET, PUT } from '@/app/api/member/project100/route'
import { POST } from '@/app/api/member/project100/submit/route'

const openSchedule = {
  applicationDeadline: '2026-11-07T23:59:59.000Z',
  kickoffAt: '2027-01-01T00:00:00.000Z',
}
const savedApplication = {
  id: 'application-1', status: 'draft', fullName: 'Ada Lovelace', phone: '+2348012345678',
  country: 'Nigeria', location: 'Lagos', interest: 'Education', areaOfFunction: 'Technology',
  teamLeadPreference: true, resourceSupportNeeds: 'Mentorship', consent: true,
  consentedAt: null, submittedAt: null, createdAt: '2026-09-09T00:00:00.000Z', updatedAt: '2026-09-09T00:00:00.000Z',
}

function request(url: string, method: string, body?: unknown) {
  return new NextRequest(`https://top100afl.com${url}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
  })
}

beforeEach(() => {
  mocks.session.mockResolvedValue({ user: { id: 'member-1', email: 'member@example.com' } })
  mocks.load.mockResolvedValue({ schedule: openSchedule, application: null, canEdit: true })
  mocks.save.mockResolvedValue({ schedule: openSchedule, application: savedApplication, canEdit: true })
  mocks.submit.mockResolvedValue({ schedule: openSchedule, application: { ...savedApplication, status: 'submitted', submittedAt: '2026-09-09T01:00:00.000Z' }, canEdit: false })
})
afterEach(() => vi.resetAllMocks())

describe('Project100 member API', () => {
  it('rejects unauthenticated reads before loading an application', async () => {
    mocks.session.mockResolvedValue(null)
    expect((await GET(request('/api/member/project100', 'GET'))).status).toBe(401)
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('loads only the signed-in member application', async () => {
    mocks.load.mockResolvedValue({ schedule: openSchedule, application: savedApplication, canEdit: true })
    const response = await GET(request('/api/member/project100', 'GET'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ application: { id: 'application-1' }, canEdit: true })
    expect(mocks.load).toHaveBeenCalledWith('member-1', expect.anything())
  })

  it('saves a partial validated draft for the signed-in member', async () => {
    const response = await PUT(request('/api/member/project100', 'PUT', { fullName: 'Ada Lovelace' }))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ application: { fullName: 'Ada Lovelace' } })
    expect(mocks.save).toHaveBeenCalledWith('member-1', { fullName: 'Ada Lovelace' }, expect.anything())
  })

  it('rejects malformed draft fields before saving', async () => {
    const response = await PUT(request('/api/member/project100', 'PUT', { teamLeadPreference: 'yes' }))
    expect(response.status).toBe(400)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('returns the deadline closure from draft saves', async () => {
    mocks.save.mockRejectedValue(new Error('Project100 applications are closed'))
    const response = await PUT(request('/api/member/project100', 'PUT', { country: 'Nigeria' }))
    expect(response.status).toBe(409)
  })

  it('rejects incomplete applications before submission', async () => {
    mocks.submit.mockRejectedValue(new Error('Complete every required field before submitting'))
    const response = await POST(request('/api/member/project100/submit', 'POST'))
    expect(response.status).toBe(400)
  })

  it('returns a conflict for duplicate submission', async () => {
    mocks.submit.mockRejectedValue(new Error('Project100 application has already been submitted'))
    const response = await POST(request('/api/member/project100/submit', 'POST'))
    expect(response.status).toBe(409)
  })

  it('submits the current member application through the server transition', async () => {
    const response = await POST(request('/api/member/project100/submit', 'POST'))
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ application: { status: 'submitted' }, canEdit: false })
    expect(mocks.submit).toHaveBeenCalledWith('member-1', expect.anything())
  })
})
