import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), createAdminClient: vi.fn() }))
vi.mock('@/lib/api/require-admin', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/supabase/server', () => ({ createAdminClient: mocks.createAdminClient }))
import { GET } from '@/app/api/admin/team-operations/route'

const request = () => new NextRequest('https://top100afl.com/api/admin/team-operations')
const member = { id: 'rep-1', team_id: 'team-1', full_name: 'Rep One', email: 'rep@example.test', role: 'agent', status: 'active' }

function database(rows: Record<string, unknown[]>, failedTable?: string) {
  return { from: (table: string) => {
    let selected = rows[table] ?? []
    const result = () => ({ data: failedTable === table ? null : selected, error: failedTable === table ? { message: 'unavailable' } : null })
    const query = {
      select: () => query,
      in: (field: string, values: string[]) => { selected = selected.filter(row => values.includes((row as Record<string, string>)[field])); return query },
      order: () => query,
      range: (from: number, to: number) => Promise.resolve({ ...result(), data: failedTable === table ? null : selected.slice(from, to + 1) }),
      then: (resolve: (value: ReturnType<typeof result>) => unknown) => Promise.resolve(result()).then(resolve),
    }
    return query
  } }
}

describe('admin team performance API', () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.requireAdmin.mockResolvedValue({ user: { id: 'admin-1' } }) })

  it('rejects non-admins before reading financial or membership records', async () => {
    mocks.requireAdmin.mockResolvedValue({ error: Response.json({}, { status: 403 }) })
    expect((await GET(request())).status).toBe(403)
    expect(mocks.createAdminClient).not.toHaveBeenCalled()
  })

  it('includes assignments beyond the first database page in member performance', async () => {
    const awardees = Array.from({ length: 1101 }, (_, index) => ({ id: `awardee-${index}`, team_id: 'team-1', is_active: true, payment_status: 'unpaid' }))
    const assignments = awardees.map((awardee, index) => ({ id: `assignment-${index}`, team_id: 'team-1', awardee_id: awardee.id, agent_id: 'rep-1', status: 'active', assigned_at: '2026-10-01T00:00:00Z', ended_at: null }))
    mocks.createAdminClient.mockReturnValue(database({ team_teams: [{ id: 'team-1', name: 'Sales' }], team_memberships: [member], team_awardees: awardees, team_assignments: assignments }))
    const response = await GET(request())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.performance?.available).toBe(true)
    expect(body.performance?.members['rep-1'].assignedCount).toBe(1101)
  })

  it('keeps access management available while marking failed financial reads unavailable', async () => {
    mocks.createAdminClient.mockReturnValue(database({ team_teams: [{ id: 'team-1', name: 'Sales' }], team_memberships: [member] }, 'team_commission_entries'))
    const response = await GET(request())
    const body = await response.json()
    expect(body.teams[0].memberships[0].id).toBe('rep-1')
    expect(body.performance).toMatchObject({ available: false })
    expect(body.performance.members).toBeUndefined()
  })

  it('fails closed when canonical contact attribution is unavailable', async () => {
    mocks.createAdminClient.mockReturnValue(database({ team_teams: [{ id: 'team-1', name: 'Sales' }], team_memberships: [member] }, 'team_payment_attributions'))
    const body = await (await GET(request())).json()
    expect(body.teams[0].memberships[0].id).toBe('rep-1')
    expect(body.performance.available).toBe(false)
  })

  it('loads contact-qualified payment attribution beyond the first page', async () => {
    const awardees = Array.from({ length: 501 }, (_, index) => ({ id: `awardee-${index}`, team_id: 'team-1', is_active: true, payment_status: 'paid', payment_currency: 'USD', payment_amount_minor: 2000, paid_at: '2026-10-15T00:00:00Z', payment_verified_at: '2026-10-15T00:01:00Z', payment_source_type: 'award_order', payment_source_id: `order-${index}` }))
    const assignments = awardees.map(row => ({ id: `assignment-${row.id}`, team_id: 'team-1', awardee_id: row.id, agent_id: 'rep-1', status: 'active', assigned_at: '2026-10-01T00:00:00Z', ended_at: null }))
    const attributions = awardees.map((row, index) => ({ id: row.id, team_id: 'team-1', awardee_id: row.id, agent_id: 'rep-1', assignment_id: `assignment-${row.id}`, payment_id: `order-${index}` }))
    mocks.createAdminClient.mockReturnValue(database({ team_teams: [{ id: 'team-1', name: 'Sales' }], team_memberships: [member], team_awardees: awardees, team_assignments: assignments, team_payment_attributions: attributions }))
    const body = await (await GET(request())).json()
    expect(body.performance.members['rep-1']).toMatchObject({ paidCount: 501, revenue: { NGN: 501 * 2500000, USD: 0 } })
  })
})
