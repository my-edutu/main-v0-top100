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

/** Verified team payment projections and the commission ledger are read-only inputs.
 * Assignment intervals match team_apply_verified_payment: start inclusive, end exclusive.
 */
export function buildTeamPerformance(
  memberships: PerformanceMember[],
  awardees: PerformanceAwardee[],
  assignments: PerformanceAssignment[],
  commissions: PerformanceCommission[],
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
  const history = new Map<string, PerformanceAssignment[]>()
  const workloads = new Set<string>()
  for (const assignment of assignments) {
    if (memberTeams.get(assignment.agent_id) !== assignment.team_id) continue
    const awardee = awardeeMap.get(assignment.awardee_id)
    if (!awardee || awardee.team_id !== assignment.team_id) continue
    const key = `${assignment.team_id}:${assignment.awardee_id}`
    const rows = history.get(key) ?? []
    rows.push(assignment)
    history.set(key, rows)
    if (assignment.status === 'active' && awardee.is_active && !workloads.has(key)) {
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
    const owners = new Set<string>()
    for (const row of rows) {
      const paidAt = Date.parse(row.paid_at ?? '')
      const matches = (history.get(`${row.team_id}:${row.id}`) ?? []).filter(assignment =>
        Date.parse(assignment.assigned_at) <= paidAt &&
        (assignment.ended_at === null || Date.parse(assignment.ended_at) > paidAt),
      ).sort((a, b) => Date.parse(b.assigned_at) - Date.parse(a.assigned_at))
      if (matches[0]) owners.add(matches[0].agent_id)
    }
    // Conflicting projection owners are not silently credited to an arbitrary rep.
    if (owners.size !== 1) { unattributedPayments[teamId]++; continue }
    const code = currency(rows[0].payment_currency)
    const amount = minorUnits(rows[0].payment_amount_minor)
    if (amount < 0 || rows.some(row => currency(row.payment_currency) !== code || minorUnits(row.payment_amount_minor) !== amount)) throw new Error('Conflicting payment projections')
    const owner = [...owners][0]
    for (const total of [members[owner], teams[teamId]]) {
      total.paidCount++
      addMoney(total.revenue, code, amount)
    }
  }

  const entries = new Set<string>()
  for (const entry of commissions) {
    if (memberTeams.get(entry.agent_id) !== entry.team_id || entries.has(entry.id)) continue
    entries.add(entry.id)
    const code = currency(entry.currency)
    const amount = minorUnits(entry.amount_minor)
    if (!['confirmed', 'pending'].includes(entry.status)) throw new Error('Unknown commission status')
    const field = entry.status === 'confirmed' ? 'confirmedCommission' : 'pendingCommission'
    for (const total of [members[entry.agent_id], teams[entry.team_id]]) addMoney(total[field], code, amount)
  }
  return { available: true, members, teams, unattributedPayments }
}

export function formatTeamMoney(amountMinor: number, code: keyof MoneyTotals) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: code, currencyDisplay: code === 'USD' ? 'code' : 'narrowSymbol', minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2, maximumFractionDigits: 2 }).format(amountMinor / 100)
}
