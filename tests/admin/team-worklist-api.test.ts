import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  createAdminClient: vi.fn(),
  rpc: vi.fn(),
}))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: mocks.createAdminClient,
}))
import { POST } from '@/app/api/admin/team-worklist/route'
import { POST as reassign } from '@/app/api/admin/team-worklist/reassign/route'
const team = '11111111-1111-4111-8111-111111111111'
const actor = '22222222-2222-4222-8222-222222222222'
function request(body: unknown) {
  return new NextRequest('https://top100afl.com/api/admin/team-worklist', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
describe('team worklist mutations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireAdmin.mockResolvedValue({ user: { id: actor } })
    mocks.createAdminClient.mockReturnValue({ rpc: mocks.rpc })
  })
  it('rejects non-admin distribution and reassignment before database access', async () => {
    mocks.requireAdmin.mockResolvedValue({
      error: Response.json({}, { status: 403 }),
    })
    expect((await POST(request({}))).status).toBe(403)
    expect((await reassign(request({}))).status).toBe(403)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })
  it('rejects missing scope, fractional and out-of-range capacity', async () => {
    for (const capacity of [0, 1.5, 5001, undefined]) {
      expect(
        (
          await POST(
            request({
              teamId: team,
              year: 2026,
              defaultCountry: 'Nigeria',
              maxAwardeesPerAgent: capacity,
            }),
          )
        ).status,
      ).toBe(400)
    }
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
  it('uses the atomic country/capacity RPC and returns its confirmed counts', async () => {
    const result = { loaded: 0, assigned: 7, country: 'Ghana', year: 2026 }
    mocks.rpc.mockResolvedValue({ data: result, error: null })
    const response = await POST(
      request({
        teamId: team,
        year: 2026,
        defaultCountry: ' Ghana ',
        maxAwardeesPerAgent: 25,
      }),
    )
    expect(await response.json()).toEqual({ result })
    expect(mocks.rpc).toHaveBeenCalledWith('team_distribute_awardee_year', {
      p_team_id: team,
      p_year: 2026,
      p_country: 'Ghana',
      p_capacity: 25,
      p_actor: actor,
    })
  })
  it('passes the correct reassignment argument and rejects missing reasons', async () => {
    expect(
      (
        await reassign(
          request({
            teamId: team,
            awardeeId: team,
            agentId: actor,
            reason: '',
          }),
        )
      ).status,
    ).toBe(400)
    mocks.rpc.mockResolvedValue({
      data: { outcome: 'reassigned' },
      error: null,
    })
    const response = await reassign(
      request({
        teamId: team,
        awardeeId: team,
        agentId: actor,
        reason: 'On leave',
      }),
    )
    expect(response.status).toBe(200)
    expect(mocks.rpc).toHaveBeenCalledWith('team_reassign_awardee', {
      p_team_id: team,
      p_awardee_id: team,
      p_new_agent_id: actor,
      p_actor: actor,
      p_reason: 'On leave',
    })
  })
})
