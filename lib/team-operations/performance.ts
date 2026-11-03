import { DEFAULT_AWARD_FEE_NGN_MINOR } from '@/lib/awards/payment-price'

export type MoneyTotals = { NGN: number; USD: number }
export type MemberPerformance = {
  assignedCount: number
  paidCount: number
  revenue: MoneyTotals
  confirmedCommission: MoneyTotals
  pendingCommission: MoneyTotals
}
export type TeamPerformance = {
  available: true
  members: Record<string, MemberPerformance>
  teams: Record<string, MemberPerformance>
  unattributedPayments: Record<string, number>
}
export type PerformanceResult = TeamPerformance | { available: false; message: string }
export type PerformanceMember = { id: string; team_id: string }
export type PerformanceAwardee = {
  id: string
  team_id: string
  is_active: boolean
  payment_status: string
  payment_currency: string | null
  payment_amount_minor: number | string | null
  paid_at: string | null
  payment_verified_at: string | null
  payment_source_type: string | null
  payment_source_id: string | null
}
export type PerformanceAssignment = {
  id: string
  team_id: string
  awardee_id: string
  agent_id: string
  status: string
  assigned_at: string
  ended_at: string | null
}
/** Canonical SQL view: assignment owner with qualifying contact before payment. */
export type PerformanceAttribution = {
  id: string
  team_id: string
  awardee_id: string
  agent_id: string
  assignment_id: string
  payment_id: string
}
export type PerformanceCommission = {
  id: string
  team_id: string
  agent_id: string
  amount_minor: number | string
  currency: string
  status: string
}

function emptyPerformance(): MemberPerformance {
  return { assignedCount: 0, paidCount: 0, revenue: { NGN: 0, USD: 0 }, confirmedCommission: { NGN: 0, USD: 0 }, pendingCommission: { NGN: 0, USD: 0 } }
}
function currency(value: string | null): keyof MoneyTotals {
  if (value !== 'NGN' && value !== 'USD') throw new Error('Unknown performance currency')
  return value
}
function minorUnits(value: number | string | null): number {
  if (value === null || (typeof value === 'string' && !/^-?\d+$/.test(value))) throw new Error('Missing or invalid performance amount')
  const amount = Number(value)
  if (!Number.isSafeInteger(amount)) throw new Error('Unsafe performance amount')
  return amount
}
function addMoney(totals: MoneyTotals, code: keyof MoneyTotals, amount: number) {
  const next = totals[code] + amount
  if (!Number.isSafeInteger(next)) throw new Error('Performance total exceeds safe precision')
  totals[code] = next
}

/** The SQL attribution view enforces contact evidence. Assignment alone never
 * earns credit. Award value uses the standard NGN price, not an FX conversion.
 * Source currency and amount are validated but remain unchanged in the ledger.
 */
export function buildTeamPerformance(
  memberships: PerformanceMember[],
  awardees: PerformanceAwardee[],
  assignments: PerformanceAssignment[],
  commissions: PerformanceCommission[],
  attributions: PerformanceAttribution[] = [],
): TeamPerformance {
  const members: TeamPerformance['members'] = {}
  const teams: TeamPerformance['teams'] = {}
  const unattributedPayments: Record<string, number> = {}
  const memberTeams = new Map(memberships.map(member => [member.id, member.team_id]))
  for (const member of memberships) {
    members[member.id] = emptyPerformance()
    teams[member.team_id] ??= emptyPerformance()
    unattributedPayments[member.team_id] ??= 0
  }
  const awardeeMap = new Map(awardees.map(awardee => [awardee.id, awardee]))
  const assignmentMap = new Map(assignments.map(assignment => [assignment.id, assignment]))
  const paymentEvidence = new Map<string, PerformanceAttribution[]>()
  for (const evidence of attributions) {
    const key = `${evidence.team_id}:${evidence.payment_id}`
    paymentEvidence.set(key, [...(paymentEvidence.get(key) ?? []), evidence])
  }
  const workloads = new Set<string>()
  const qualified = new Set(attributions.map(row => `${row.team_id}:${row.awardee_id}:${row.agent_id}:${row.assignment_id}:${row.payment_id}`))
  const hasCredit = (awardee: PerformanceAwardee, assignment: PerformanceAssignment) => qualified.has(
    `${awardee.team_id}:${awardee.id}:${assignment.agent_id}:${assignment.id}:${awardee.payment_source_id}`,
  )
  for (const assignment of assignments) {
    if (memberTeams.get(assignment.agent_id) !== assignment.team_id) continue
    const awardee = awardeeMap.get(assignment.awardee_id)
    if (!awardee || awardee.team_id !== assignment.team_id) continue
    const key = `${assignment.team_id}:${assignment.awardee_id}`
    const independentPayment = awardee.payment_status === 'paid' && !hasCredit(awardee, assignment)
    if (assignment.status === 'active' && awardee.is_active && !independentPayment && !workloads.has(key)) {
      workloads.add(key)
      members[assignment.agent_id].assignedCount++
      teams[assignment.team_id].assignedCount++
    }
  }

  // One verified source payment can appear on archived campaign projections.
  const payments = new Map<string, PerformanceAwardee[]>()
  for (const awardee of awardees) {
    if (!teams[awardee.team_id] || awardee.payment_status !== 'paid' || !awardee.payment_verified_at || awardee.payment_source_type !== 'award_order' || !awardee.payment_source_id) continue
    const key = `${awardee.team_id}:${awardee.payment_source_id}`
    payments.set(key, [...(payments.get(key) ?? []), awardee])
  }
  for (const rows of payments.values()) {
    const teamId = rows[0].team_id
    const qualifiedOwners = new Set<string>()
    const paidAt = Date.parse(rows[0].paid_at ?? '')
    if (!Number.isFinite(paidAt) || rows.some(row => Date.parse(row.paid_at ?? '') !== paidAt)) {
      unattributedPayments[teamId]++; continue
    }
    for (const evidence of paymentEvidence.get(`${teamId}:${rows[0].payment_source_id}`) ?? []) {
      const assignment = assignmentMap.get(evidence.assignment_id)
      const contactAwardee = awardeeMap.get(evidence.awardee_id)
      if (assignment && contactAwardee?.team_id === teamId && assignment.team_id === teamId &&
        assignment.awardee_id === evidence.awardee_id && assignment.agent_id === evidence.agent_id &&
        memberTeams.get(evidence.agent_id) === teamId && Date.parse(assignment.assigned_at) <= paidAt &&
        (assignment.ended_at === null || Date.parse(assignment.ended_at) > paidAt)) {
        qualifiedOwners.add(evidence.agent_id)
      }
    }
    // Only the canonical evidence winner receives credit, including when an
    // archived duplicate belonged to a different rep. Conflicting evidence
    // itself is treated as unavailable ownership rather than counted twice.
    if (qualifiedOwners.size !== 1) { unattributedPayments[teamId]++; continue }
    const code = currency(rows[0].payment_currency)
    const amount = minorUnits(rows[0].payment_amount_minor)
    if (amount <= 0 || rows.some(row => currency(row.payment_currency) !== code || minorUnits(row.payment_amount_minor) !== amount)) throw new Error('Conflicting payment projections')
    const owner = [...qualifiedOwners][0]
    for (const total of [members[owner], teams[teamId]]) {
      total.paidCount++
      addMoney(total.revenue, 'NGN', DEFAULT_AWARD_FEE_NGN_MINOR)
    }
  }

  const entries = new Set<string>()
  for (const entry of commissions) {
    if (memberTeams.get(entry.agent_id) !== entry.team_id || entries.has(entry.id)) continue
    entries.add(entry.id)
    const code = currency(entry.currency)
    const amount = minorUnits(entry.amount_minor)
    if (code !== 'NGN' && amount !== 0) throw new Error('Naira commission requires a naira ledger entry; foreign commission cannot be relabelled.')
    if (!['confirmed', 'pending'].includes(entry.status)) throw new Error('Unknown commission status')
    const field = entry.status === 'confirmed' ? 'confirmedCommission' : 'pendingCommission'
    for (const total of [members[entry.agent_id], teams[entry.team_id]]) addMoney(total[field], code, amount)
  }
  return { available: true, members, teams, unattributedPayments }
}

export function formatTeamMoney(amountMinor: number, code: keyof MoneyTotals) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: code, currencyDisplay: code === 'USD' ? 'code' : 'narrowSymbol', minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(amountMinor / 100)
}
