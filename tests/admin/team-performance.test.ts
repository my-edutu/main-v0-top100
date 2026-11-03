import { describe, expect, it } from 'vitest'
import { buildTeamPerformance, type PerformanceAwardee, type PerformanceAssignment, type PerformanceAttribution } from '@/lib/team-operations/performance'

const members = [{ id: 'rep-a', team_id: 'team' }, { id: 'rep-b', team_id: 'team' }, { id: 'other-rep', team_id: 'other-team' }]
const paid = (id: string, extra: Partial<PerformanceAwardee> = {}): PerformanceAwardee => ({
  id, team_id: 'team', is_active: true, payment_status: 'paid', payment_currency: 'NGN', payment_amount_minor: 2500000,
  paid_at: '2026-10-15T10:00:00Z', payment_verified_at: '2026-10-15T10:01:00Z', payment_source_type: 'award_order', payment_source_id: `order-${id}`, ...extra,
})
const assigned = (awardee: string, agent = 'rep-a', extra: Partial<PerformanceAssignment> = {}): PerformanceAssignment => ({
  id: `assignment-${awardee}-${agent}`, team_id: 'team', awardee_id: awardee, agent_id: agent,
  status: 'active', assigned_at: '2026-10-01T00:00:00Z', ended_at: null, ...extra,
})
const attributed = (id: string, agent = 'rep-a', extra: Partial<PerformanceAttribution> = {}): PerformanceAttribution => ({
  id, team_id: 'team', awardee_id: id, agent_id: agent, assignment_id: `assignment-${id}-${agent}`, payment_id: `order-${id}`, ...extra,
})

describe('team performance attribution', () => {
  it('retains an explicitly grandfathered payment without labelling its outreach verified', () => {
    const result = buildTeamPerformance(members, [paid('legacy')], [assigned('legacy')], [
      { id: 'earning', team_id: 'team', agent_id: 'rep-a', amount_minor: 200000, currency: 'NGN', status: 'confirmed' },
      { id: 'reversal', team_id: 'team', agent_id: 'rep-a', amount_minor: -200000, currency: 'NGN', status: 'confirmed' },
      { id: 'grace-restoration', team_id: 'team', agent_id: 'rep-a', amount_minor: 200000, currency: 'NGN', status: 'confirmed' },
    ], [attributed('legacy', 'rep-a', { contact_kind: 'legacy_grace' })])
    expect(result.members['rep-a']).toMatchObject({ assignedCount: 1, paidCount: 1, legacyGraceCount: 1, confirmedCommission: { NGN: 200000, USD: 0 } })
    expect(result.teams.team.legacyGraceCount).toBe(1)
    expect(result.unattributedPayments.team).toBe(0)
  })

  it('keeps historical revenue with the owner at payment time while counting current workloads', () => {
    const result = buildTeamPerformance(members, [paid('one')], [
      assigned('one', 'rep-a', { status: 'reassigned', ended_at: '2026-10-20T00:00:00Z' }),
      assigned('one', 'rep-b', { assigned_at: '2026-10-20T00:00:00Z' }),
    ], [], [attributed('one')])
    expect(result.members['rep-a']).toMatchObject({ assignedCount: 0, paidCount: 1, revenue: { NGN: 2500000, USD: 0 } })
    expect(result.members['rep-b']).toMatchObject({ assignedCount: 0, paidCount: 0, revenue: { NGN: 0, USD: 0 } })
  })

  it('does not credit payments made before assignment and uses the new owner at the exact reassignment boundary', () => {
    const result = buildTeamPerformance(members, [paid('early', { paid_at: '2026-09-01T00:00:00Z' }), paid('boundary', { paid_at: '2026-10-20T00:00:00Z' })], [
      assigned('early'), assigned('boundary', 'rep-a', { status: 'reassigned', ended_at: '2026-10-20T00:00:00Z' }),
      assigned('boundary', 'rep-b', { assigned_at: '2026-10-20T00:00:00Z' }),
    ], [], [attributed('early'), attributed('boundary', 'rep-b')])
    expect(result.members['rep-a'].paidCount).toBe(0)
    expect(result.members['rep-b'].paidCount).toBe(1)
    expect(result.unattributedPayments.team).toBe(1)
  })

  it('excludes pending, refunded and unverified payments and counts duplicated payment identities once', () => {
    const awardees = [paid('one'), paid('duplicate', { payment_source_id: 'order-one' }), paid('pending', { payment_status: 'pending' }), paid('refund', { payment_status: 'refunded' }), paid('unverified', { payment_verified_at: null })]
    const result = buildTeamPerformance(members, awardees, awardees.map(row => assigned(row.id)), [], awardees.map(row => attributed(row.id, 'rep-a', { payment_id: row.payment_source_id! })))
    expect(result.members['rep-a'].paidCount).toBe(1)
    expect(result.members['rep-a'].revenue.NGN).toBe(2500000)
  })

  it('shows standard naira award value for genuine NGN and USD payments and nets ledger reversals', () => {
    const result = buildTeamPerformance(members, [paid('ngn'), paid('usd', { payment_currency: 'USD', payment_amount_minor: '2000' })], [assigned('ngn'), assigned('usd')], [
      { id: 'earning', team_id: 'team', agent_id: 'rep-a', amount_minor: '500000', currency: 'NGN', status: 'confirmed' },
      { id: 'reversal', team_id: 'team', agent_id: 'rep-a', amount_minor: -500000, currency: 'NGN', status: 'confirmed' },
      { id: 'pending', team_id: 'team', agent_id: 'rep-a', amount_minor: 500000, currency: 'NGN', status: 'pending' },
    ], [attributed('ngn'), attributed('usd')])
    expect(result.members['rep-a'].revenue).toEqual({ NGN: 5000000, USD: 0 })
    expect(result.members['rep-a'].confirmedCommission).toEqual({ NGN: 0, USD: 0 })
    expect(result.members['rep-a'].pendingCommission).toEqual({ NGN: 500000, USD: 0 })
    expect(result.teams.team.revenue).toEqual({ NGN: 5000000, USD: 0 })
  })

  it('does not credit cross-team ownership and preserves genuine zero metrics for members without assignments', () => {
    const result = buildTeamPerformance(members, [paid('one')], [assigned('one', 'other-rep')], [])
    expect(result.members['other-rep'].paidCount).toBe(0)
    expect(result.members['rep-a'].assignedCount).toBe(0)
    expect(result.members['rep-a'].revenue.NGN).toBe(0)
    expect(result.unattributedPayments.team).toBe(1)
  })

  it('rejects invalid money rather than showing a fabricated zero or rounded revenue', () => {
    expect(() => buildTeamPerformance(members, [paid('one', { payment_amount_minor: null })], [assigned('one')], [], [attributed('one')])).toThrow()
    expect(() => buildTeamPerformance(members, [paid('one', { payment_amount_minor: '2.5' })], [assigned('one')], [], [attributed('one')])).toThrow()
  })

  it('never credits assignment alone and excludes an independent payer from current workload', () => {
    const result = buildTeamPerformance(members, [paid('one')], [assigned('one')], [])
    expect(result.members['rep-a']).toMatchObject({ assignedCount: 0, paidCount: 0, revenue: { NGN: 0, USD: 0 } })
    expect(result.unattributedPayments.team).toBe(1)
  })

  it('rejects evidence for a different assignment, payment or team', () => {
    for (const extra of [{ assignment_id: 'other' }, { payment_id: 'different' }, { team_id: 'other-team' }, { agent_id: 'rep-b' }]) {
      const result = buildTeamPerformance(members, [paid('one')], [assigned('one')], [], [attributed('one', 'rep-a', extra)])
      expect(result.members['rep-a'].paidCount).toBe(0)
    }
  })

  it('uses the canonical qualified projection without crediting the other duplicate owner', () => {
    const result = buildTeamPerformance(members, [paid('one'), paid('duplicate', { payment_source_id: 'order-one' })], [assigned('one'), assigned('duplicate', 'rep-b')], [], [attributed('one')])
    expect(result.members['rep-a'].paidCount).toBe(1)
    expect(result.members['rep-b'].paidCount).toBe(0)
    expect(result.unattributedPayments.team).toBe(0)
  })

  it('fails closed if canonical evidence contradicts itself about the owner', () => {
    const result = buildTeamPerformance(members, [paid('one'), paid('duplicate', { payment_source_id: 'order-one' })], [assigned('one'), assigned('duplicate', 'rep-b')], [], [attributed('one'), attributed('duplicate', 'rep-b', { payment_id: 'order-one' })])
    expect(result.members['rep-a'].paidCount).toBe(0)
    expect(result.members['rep-b'].paidCount).toBe(0)
    expect(result.unattributedPayments.team).toBe(1)
  })

  it('credits canonical historical evidence on an archived duplicate whose paid projection lives on the keeper', () => {
    const result = buildTeamPerformance(members, [paid('keeper'), paid('archive', { is_active: false, payment_status: 'unpaid', payment_source_id: null, payment_verified_at: null })], [assigned('keeper', 'rep-b'), assigned('archive', 'rep-a', { status: 'removed', ended_at: '2026-10-20T00:00:00Z' })], [], [attributed('archive', 'rep-a', { payment_id: 'order-keeper' })])
    expect(result.members['rep-a'].paidCount).toBe(1)
    expect(result.members['rep-b'].paidCount).toBe(0)
    expect(result.teams.team.revenue.NGN).toBe(2500000)
  })

  it('fails visibly for unsupported USD commission rather than silently hiding or relabelling it', () => {
    expect(() => buildTeamPerformance(members, [], [], [
      { id: 'usd-commission', team_id: 'team', agent_id: 'rep-a', amount_minor: 400, currency: 'USD', status: 'confirmed' },
    ])).toThrow('Naira commission')
  })
})
