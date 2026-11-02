import { describe, expect, it } from 'vitest'
import { buildTeamPerformance, type PerformanceAwardee, type PerformanceAssignment } from '@/lib/team-operations/performance'

const members = [{ id: 'rep-a', team_id: 'team' }, { id: 'rep-b', team_id: 'team' }, { id: 'other-rep', team_id: 'other-team' }]
const paid = (id: string, extra: Partial<PerformanceAwardee> = {}): PerformanceAwardee => ({
  id, team_id: 'team', is_active: true, payment_status: 'paid', payment_currency: 'NGN', payment_amount_minor: 2500000,
  paid_at: '2026-10-15T10:00:00Z', payment_verified_at: '2026-10-15T10:01:00Z', payment_source_type: 'award_order', payment_source_id: `order-${id}`, ...extra,
})
const assigned = (awardee: string, agent = 'rep-a', extra: Partial<PerformanceAssignment> = {}): PerformanceAssignment => ({
  id: `assignment-${awardee}-${agent}`, team_id: 'team', awardee_id: awardee, agent_id: agent,
  status: 'active', assigned_at: '2026-10-01T00:00:00Z', ended_at: null, ...extra,
})

describe('team performance attribution', () => {
  it('keeps historical revenue with the owner at payment time while counting current workloads', () => {
    const result = buildTeamPerformance(members, [paid('one')], [
      assigned('one', 'rep-a', { status: 'reassigned', ended_at: '2026-10-20T00:00:00Z' }),
      assigned('one', 'rep-b', { assigned_at: '2026-10-20T00:00:00Z' }),
    ], [])
    expect(result.members['rep-a']).toMatchObject({ assignedCount: 0, paidCount: 1, revenue: { NGN: 2500000, USD: 0 } })
    expect(result.members['rep-b']).toMatchObject({ assignedCount: 1, paidCount: 0, revenue: { NGN: 0, USD: 0 } })
  })

  it('does not credit payments made before assignment and uses the new owner at the exact reassignment boundary', () => {
    const result = buildTeamPerformance(members, [paid('early', { paid_at: '2026-09-01T00:00:00Z' }), paid('boundary', { paid_at: '2026-10-20T00:00:00Z' })], [
      assigned('early'), assigned('boundary', 'rep-a', { status: 'reassigned', ended_at: '2026-10-20T00:00:00Z' }),
      assigned('boundary', 'rep-b', { assigned_at: '2026-10-20T00:00:00Z' }),
    ], [])
    expect(result.members['rep-a'].paidCount).toBe(0)
    expect(result.members['rep-b'].paidCount).toBe(1)
    expect(result.unattributedPayments.team).toBe(1)
  })

  it('excludes pending, refunded and unverified payments and counts duplicated payment identities once', () => {
    const awardees = [paid('one'), paid('duplicate', { payment_source_id: 'order-one' }), paid('pending', { payment_status: 'pending' }), paid('refund', { payment_status: 'refunded' }), paid('unverified', { payment_verified_at: null })]
    const result = buildTeamPerformance(members, awardees, awardees.map(row => assigned(row.id)), [])
    expect(result.members['rep-a'].paidCount).toBe(1)
    expect(result.members['rep-a'].revenue.NGN).toBe(2500000)
  })

  it('keeps currencies separate and derives commission from the ledger including reversals and pending entries', () => {
    const result = buildTeamPerformance(members, [paid('ngn'), paid('usd', { payment_currency: 'USD', payment_amount_minor: '2000' })], [assigned('ngn'), assigned('usd')], [
      { id: 'earning', team_id: 'team', agent_id: 'rep-a', amount_minor: '500000', currency: 'NGN', status: 'confirmed' },
      { id: 'reversal', team_id: 'team', agent_id: 'rep-a', amount_minor: -500000, currency: 'NGN', status: 'confirmed' },
      { id: 'pending', team_id: 'team', agent_id: 'rep-a', amount_minor: 500000, currency: 'NGN', status: 'pending' },
      { id: 'usd-commission', team_id: 'team', agent_id: 'rep-a', amount_minor: 400, currency: 'USD', status: 'confirmed' },
    ])
    expect(result.members['rep-a'].revenue).toEqual({ NGN: 2500000, USD: 2000 })
    expect(result.members['rep-a'].confirmedCommission).toEqual({ NGN: 0, USD: 400 })
    expect(result.members['rep-a'].pendingCommission).toEqual({ NGN: 500000, USD: 0 })
    expect(result.teams.team.revenue).toEqual({ NGN: 2500000, USD: 2000 })
  })

  it('does not credit cross-team ownership and preserves genuine zero metrics for members without assignments', () => {
    const result = buildTeamPerformance(members, [paid('one')], [assigned('one', 'other-rep')], [])
    expect(result.members['other-rep'].paidCount).toBe(0)
    expect(result.members['rep-a'].assignedCount).toBe(0)
    expect(result.members['rep-a'].revenue.NGN).toBe(0)
    expect(result.unattributedPayments.team).toBe(1)
  })

  it('rejects invalid money rather than showing a fabricated zero or rounded revenue', () => {
    expect(() => buildTeamPerformance(members, [paid('one', { payment_amount_minor: null })], [assigned('one')], [])).toThrow()
    expect(() => buildTeamPerformance(members, [paid('one', { payment_amount_minor: '2.5' })], [assigned('one')], [])).toThrow()
  })
})
