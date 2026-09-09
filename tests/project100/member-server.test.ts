import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  application: null as Record<string, unknown> | null,
  deadline: '2099-11-07T23:59:59.000Z',
  memberIds: [] as string[],
  rpc: vi.fn(),
  clientOptions: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: () => ({
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({
      data: { application_deadline: mocks.deadline, kickoff_at: '2100-01-01T00:00:00.000Z', updated_at: '2099-01-01T00:00:00.000Z' },
      error: null,
    }) }) }) }),
  }),
}))

vi.mock('@supabase/supabase-js', () => ({
  createClient: (_url: string, _key: string, options: Record<string, unknown>) => {
    mocks.clientOptions.push(options)
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        if (column === 'member_id') mocks.memberIds.push(String(value))
        return query
      },
      maybeSingle: async () => ({ data: mocks.application, error: null }),
      update: (columns: Record<string, unknown>) => {
        mocks.application = { ...mocks.application, ...columns }
        return query
      },
      insert: (columns: Record<string, unknown>) => {
        mocks.application = { ...columns, id: 'application-1', status: 'draft', created_at: '2099-01-01T00:00:00.000Z', updated_at: '2099-01-01T00:00:00.000Z', consented_at: null, submitted_at: null }
        return query
      },
      single: async () => ({ data: mocks.application, error: null }),
    }
    return {
      from: () => query,
      rpc: async (name: string) => {
        mocks.rpc(name)
        const submitted = { ...mocks.application, status: 'submitted', submitted_at: '2099-01-01T01:00:00.000Z' }
        mocks.application = submitted
        return { data: submitted, error: null }
      },
    }
  },
}))

import { loadMemberProject100, saveMemberProject100Draft, submitMemberProject100 } from '@/lib/project100/server'

function completeApplication() {
  return {
    id: 'application-1', member_id: 'member-1', status: 'draft', full_name: 'Ada Lovelace', phone: '+2348012345678',
    country: 'Nigeria', location: 'Lagos', interest: 'Education', area_of_function: 'Technology',
    team_lead_preference: true, resource_support_needs: 'Mentorship', consent: true,
    consented_at: '2099-01-01T00:00:00.000Z', submitted_at: null,
    created_at: '2099-01-01T00:00:00.000Z', updated_at: '2099-01-01T00:00:00.000Z',
  }
}

beforeEach(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-key'
  mocks.application = completeApplication()
  mocks.deadline = '2099-11-07T23:59:59.000Z'
  mocks.memberIds.length = 0
  mocks.rpc.mockReset()
  mocks.clientOptions.length = 0
})
afterEach(() => vi.restoreAllMocks())

describe('Project100 member persistence', () => {
  it('scopes reads to the signed-in member and omits member ids from the response', async () => {
    const result = await loadMemberProject100('member-1', 'verified-bearer-token')
    expect(mocks.memberIds).toEqual(['member-1'])
    expect(result.application).toMatchObject({ id: 'application-1', fullName: 'Ada Lovelace' })
    expect(result.application).not.toHaveProperty('memberId')
    expect(mocks.clientOptions[0]).toMatchObject({ global: { headers: { Authorization: 'Bearer verified-bearer-token' } } })
  })

  it('updates only supplied draft answers and preserves stored answers', async () => {
    const result = await saveMemberProject100Draft('member-1', { fullName: 'Ada Byron' }, 'verified-bearer-token')
    expect(result.application).toMatchObject({ fullName: 'Ada Byron', country: 'Nigeria', interest: 'Education' })
  })

  it('uses the constrained RPC only after a complete draft passes validation', async () => {
    const result = await submitMemberProject100('member-1', 'verified-bearer-token')
    expect(mocks.rpc).toHaveBeenCalledWith('submit_project100_application')
    expect(result).toMatchObject({ application: { status: 'submitted' }, canEdit: false })
  })

  it('does not issue a database write after the schedule closes', async () => {
    mocks.deadline = '2000-01-01T00:00:00.000Z'
    await expect(saveMemberProject100Draft('member-1', { country: 'Ghana' }, 'verified-bearer-token'))
      .rejects.toThrow('Project100 applications are closed')
    expect(mocks.memberIds).toEqual([])
  })
})
