import 'server-only'
import { createAdminClient } from '@/lib/supabase/admin'
import type {
  AdminDashboard,
  AgentDashboard,
  Balance,
  Membership,
  SessionMember,
} from '@/lib/types'
import { isStaff } from '@/lib/auth'

export type AwardeeDirectoryRow = {
  id: string
  team_id: string
  external_key: string | null
  public_awardee_id: string | null
  profile_id: string | null
  name: string
  email: string | null
  phone: string | null
  country: string | null
  state: string | null
  city: string | null
  address: string | null
  notes: string | null
  payment_status: 'unpaid' | 'pending' | 'paid' | 'refunded'
  payment_note: string | null
  payment_currency: string | null
  payment_amount_minor: number | null
  paid_at: string | null
  payment_source_type: string | null
  payment_source_id: string | null
  payment_verified_at: string | null
  contact_status: 'not_contacted' | 'contacted' | 'responded'
  last_contacted_at: string | null
  last_contact_channel: string | null
  next_followup_at: string | null
  followup_status: string
  is_active: boolean
  created_at: string
  updated_at: string
  assignment_id: string | null
  agent_id: string | null
  assigned_at: string | null
  agent_name: string | null
  agent_email: string | null
}

export type AwardeeFilters = {
  search?: string
  paymentStatus?: string[]
  contactStatus?: string
  country?: string
  agentId?: string
  assignment?: 'assigned' | 'unassigned' | ''
  followUp?: 'due' | 'overdue' | 'scheduled' | ''
  page?: number
  pageSize?: number
  sort?: 'name' | 'newest' | 'followup' | 'last_contact' | 'shuffle'
  shuffleSeed?: string
  includeInactive?: boolean
}

function sanitizeSearch(value: string) {
  return value.replace(/[%,()*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}

function createSeededRandom(seed: string) {
  let state = 2166136261
  for (let index = 0; index < seed.length; index++) {
    state = Math.imul(state ^ seed.charCodeAt(index), 16777619)
  }

  return () => {
    state += 0x6d2b79f5
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function shuffleRows<T>(rows: T[], seed: string): T[] {
  const shuffled = [...rows]
  const random = createSeededRandom(seed)
  for (let index = shuffled.length - 1; index > 0; index--) {
    const swapIndex = Math.floor(random() * (index + 1))
    ;[shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]]
  }
  return shuffled
}

function raise(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`)
}

function agentScope(query: any, member: SessionMember) {
  return member.membership.role === 'agent'
    ? query.eq('agent_id', member.membership.id)
    : query
}

export async function listAwardees(
  member: SessionMember,
  filters: AwardeeFilters = {},
) {
  const admin = createAdminClient()
  const page = Math.max(filters.page ?? 1, 1)
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 1), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const buildQuery = () => {
    let query = admin
      .from('team_awardee_directory')
      .select('*', { count: 'exact' })
      .eq('team_id', member.membership.team_id)

    if (!filters.includeInactive) query = query.eq('is_active', true)
    query = agentScope(query, member)
    if (filters.agentId && isStaff(member.membership.role)) query = query.eq('agent_id', filters.agentId)
    if (filters.assignment === 'unassigned') query = query.is('agent_id', null)
    if (filters.assignment === 'assigned') query = query.not('agent_id', 'is', null)
    if (filters.paymentStatus?.length) query = query.in('payment_status', filters.paymentStatus)
    if (filters.contactStatus) query = query.eq('contact_status', filters.contactStatus)
    if (filters.country) query = query.eq('country', filters.country)
    if (filters.followUp === 'due') query = query.lte('next_followup_at', new Date().toISOString().slice(0, 10))
    if (filters.followUp === 'overdue') query = query.lt('next_followup_at', new Date().toISOString().slice(0, 10))
    if (filters.followUp === 'scheduled') query = query.gt('next_followup_at', new Date().toISOString().slice(0, 10))

    const search = sanitizeSearch(filters.search ?? '')
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    return query
  }

  if (filters.sort === 'shuffle') {
    const shuffledRows: AwardeeDirectoryRow[] = []
    let total = 0
    let offset = 0
    const batchSize = 1000

    while (true) {
      const { data, error, count } = await buildQuery()
        .order('id', { ascending: true })
        .range(offset, offset + batchSize - 1)
      raise(error, 'Could not load awardees')

      const batch = (data ?? []) as AwardeeDirectoryRow[]
      if (offset === 0) total = count ?? batch.length
      shuffledRows.push(...batch)
      offset += batch.length

      if (batch.length < batchSize || offset >= total) break
    }

    const shuffled = shuffleRows(shuffledRows, filters.shuffleSeed ?? 'awardee-directory')
    return {
      rows: shuffled.slice(from, to + 1),
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    }
  }

  let query = buildQuery()
  switch (filters.sort) {
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    case 'followup':
      query = query.order('next_followup_at', { ascending: true, nullsFirst: false })
      break
    case 'last_contact':
      query = query.order('last_contacted_at', { ascending: false, nullsFirst: false })
      break
    default:
      query = query.order('name', { ascending: true })
  }

  const { data, error, count } = await query.range(from, to)
  raise(error, 'Could not load awardees')
  return {
    rows: (data ?? []) as AwardeeDirectoryRow[],
    total: count ?? 0,
    page,
    pageSize,
    pages: Math.ceil((count ?? 0) / pageSize),
  }
}

export async function getRandomAwardees(member: SessionMember, sampleSize = 5) {
  const admin = createAdminClient()
  let countQuery = admin
    .from('team_awardee_directory')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', member.membership.team_id)
    .eq('is_active', true)
  if (member.membership.role === 'agent') countQuery = countQuery.eq('agent_id', member.membership.id)
  const { count, error } = await countQuery
  raise(error, 'Could not count awardees')

  const total = count ?? 0
  const size = Math.min(Math.max(sampleSize, 0), total)
  if (!size) return [] as AwardeeDirectoryRow[]

  const indexes = new Set<number>()
  while (indexes.size < size) indexes.add(Math.floor(Math.random() * total))
  const rows = await Promise.all([...indexes].map(async (index) => {
    let query = admin
      .from('team_awardee_directory')
      .select('*')
      .eq('team_id', member.membership.team_id)
      .eq('is_active', true)
    if (member.membership.role === 'agent') query = query.eq('agent_id', member.membership.id)
    const { data, error: rowError } = await query.order('id', { ascending: true }).range(index, index).maybeSingle()
    raise(rowError, 'Could not load a random awardee')
    return data as AwardeeDirectoryRow | null
  }))

  return rows.filter((row): row is AwardeeDirectoryRow => row !== null)
}

export async function getAwardeeDetail(member: SessionMember, awardeeId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_awardee_directory')
    .select('*')
    .eq('id', awardeeId)
    .eq('team_id', member.membership.team_id)
    .maybeSingle()
  raise(error, 'Could not load awardee')
  if (!data) return null
  const awardee = data as AwardeeDirectoryRow
  if (member.membership.role === 'agent' && awardee.agent_id !== member.membership.id) return null

  const [followups, emails, assignments, commissions, templates, agents] = await Promise.all([
    admin
      .from('team_followups')
      .select('*, team_memberships(full_name)')
      .eq('awardee_id', awardeeId)
      .order('contacted_at', { ascending: false })
      .limit(100),
    admin
      .from('team_email_logs')
      .select('id, to_email, subject, status, error, attempted_at, sent_at, provider_message_id')
      .eq('awardee_id', awardeeId)
      .order('attempted_at', { ascending: false })
      .limit(30),
    admin
      .from('team_assignments')
      .select('id, status, assigned_at, ended_at, end_reason, assignment_strategy, team_memberships(full_name,email)')
      .eq('awardee_id', awardeeId)
      .order('assigned_at', { ascending: false }),
    admin
      .from('team_commission_entries')
      .select('id, agent_id, entry_type, amount_minor, currency, status, earned_at, available_at, reason')
      .eq('awardee_id', awardeeId)
      .order('created_at', { ascending: false }),
    admin
      .from('team_templates')
      .select('*')
      .eq('team_id', member.membership.team_id)
      .eq('is_active', true)
      .order('channel'),
    isStaff(member.membership.role) ? getAgentOptions(member) : Promise.resolve([]),
  ])

  return {
    awardee,
    followups: followups.data ?? [],
    emails: emails.data ?? [],
    assignments: assignments.data ?? [],
    commissions: commissions.data ?? [],
    templates: templates.data ?? [],
    agents,
    canViewFinance: isStaff(member.membership.role),
  }
}

export async function listFollowups(
  member: SessionMember,
  options: { channel?: string; outcome?: string; agentId?: string; limit?: number } = {},
) {
  const admin = createAdminClient()
  let query = admin
    .from('team_followups')
    .select('*, team_awardees(id,name,phone,payment_status,country), team_memberships(full_name)', { count: 'exact' })
    .eq('team_id', member.membership.team_id)
  if (member.membership.role === 'agent') query = query.eq('agent_id', member.membership.id)
  else if (options.agentId) query = query.eq('agent_id', options.agentId)
  if (options.channel) query = query.eq('channel', options.channel)
  if (options.outcome) query = query.eq('outcome', options.outcome)
  const { data, error, count } = await query
    .order('contacted_at', { ascending: false })
    .limit(Math.min(options.limit ?? 100, 500))
  raise(error, 'Could not load follow-up activity')
  return { rows: data ?? [], total: count ?? 0 }
}

export async function getFollowupQueue(member: SessionMember) {
  const admin = createAdminClient()
  const today = new Date().toISOString().slice(0, 10)
  let query = admin
    .from('team_awardee_directory')
    .select('*')
    .eq('team_id', member.membership.team_id)
    .eq('is_active', true)
    .lte('next_followup_at', today)
    .order('next_followup_at', { ascending: true })
    .limit(150)
  query = agentScope(query, member)
  const { data, error } = await query
  raise(error, 'Could not load follow-up queue')
  return (data ?? []) as AwardeeDirectoryRow[]
}

export async function getBalance(member: SessionMember, currency = 'NGN'): Promise<Balance> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('team_agent_balance', {
    p_team_id: member.membership.team_id,
    p_agent_id: member.membership.id,
    p_currency: currency,
  })
  raise(error, 'Could not load balance')
  return data as Balance
}

export async function getEarnings(member: SessionMember) {
  const admin = createAdminClient()
  const [balance, entries, withdrawals, rules] = await Promise.all([
    getBalance(member),
    admin
      .from('team_commission_entries')
      .select('*, team_awardees(name)')
      .eq('team_id', member.membership.team_id)
      .eq('agent_id', member.membership.id)
      .order('created_at', { ascending: false })
      .limit(100),
    admin
      .from('team_withdrawal_requests')
      .select('*, team_withdrawal_payouts(transaction_reference,paid_at,amount_minor)')
      .eq('team_id', member.membership.team_id)
      .eq('agent_id', member.membership.id)
      .order('created_at', { ascending: false })
      .limit(50),
    admin
      .from('team_commission_rules')
      .select('*')
      .eq('team_id', member.membership.team_id)
      .eq('is_active', true)
      .order('priority', { ascending: false }),
  ])
  raise(entries.error, 'Could not load commissions')
  raise(withdrawals.error, 'Could not load withdrawals')
  return {
    balance,
    entries: entries.data ?? [],
    withdrawals: withdrawals.data ?? [],
    rules: rules.data ?? [],
  }
}

export async function listWithdrawals(
  member: SessionMember,
  options: { status?: string; agentId?: string } = {},
) {
  const admin = createAdminClient()
  let query = admin
    .from('team_withdrawal_requests')
    .select('*, team_memberships(full_name,email), team_withdrawal_payouts(transaction_reference,paid_at,amount_minor,note)', {
      count: 'exact',
    })
    .eq('team_id', member.membership.team_id)
  if (member.membership.role === 'agent') query = query.eq('agent_id', member.membership.id)
  else if (options.agentId) query = query.eq('agent_id', options.agentId)
  if (options.status) query = query.eq('status', options.status)
  const { data, error, count } = await query.order('created_at', { ascending: false }).limit(200)
  raise(error, 'Could not load withdrawals')
  return { rows: data ?? [], total: count ?? 0 }
}

export async function getNotifications(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_notifications')
    .select('*')
    .eq('user_id', member.user.id)
    .order('created_at', { ascending: false })
    .limit(80)
  raise(error, 'Could not load notifications')
  const rows = data ?? []
  return { rows, unread: rows.filter((row) => !row.read_at).length }
}

export async function getAgentDashboard(member: SessionMember): Promise<AgentDashboard> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('team_agent_dashboard', {
    p_team_id: member.membership.team_id,
    p_actor: member.user.id,
    p_currency: 'NGN',
  })
  raise(error, 'Could not load dashboard')
  return data as AgentDashboard
}

export async function getAdminDashboard(member: SessionMember): Promise<AdminDashboard> {
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('team_admin_dashboard', {
    p_team_id: member.membership.team_id,
    p_actor: member.user.id,
    p_currency: 'NGN',
  })
  raise(error, 'Could not load dashboard')
  return data as AdminDashboard
}

export type LeaderDashboard = Pick<
  AdminDashboard,
  | 'paid'
  | 'unpaid'
  | 'pending_verification'
  | 'total_awardees'
  | 'commissions_generated_minor'
>

export async function getLeaderDashboard(member: SessionMember): Promise<LeaderDashboard> {
  const full = await getAdminDashboard(member)
  return {
    total_awardees: full.total_awardees,
    paid: full.paid,
    unpaid: full.unpaid,
    pending_verification: full.pending_verification,
    commissions_generated_minor: full.commissions_generated_minor,
  }
}

export async function getTeamMembers(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_memberships')
    .select('*')
    .eq('team_id', member.membership.team_id)
    .order('created_at', { ascending: true })
  raise(error, 'Could not load team')
  const rows = (data ?? []) as Membership[]
  const { data: assignments, error: assignmentError } = await admin
    .from('team_assignments')
    .select('agent_id')
    .eq('team_id', member.membership.team_id)
    .eq('status', 'active')
  raise(assignmentError, 'Could not load workloads')
  const counts = new Map<string, number>()
  for (const row of assignments ?? []) {
    counts.set(row.agent_id, (counts.get(row.agent_id) ?? 0) + 1)
  }
  return rows.map((row) => ({ ...row, workload: counts.get(row.id) ?? 0 }))
}

export async function getAgentOptions(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_memberships')
    .select('id, full_name, email, role, status')
    .eq('team_id', member.membership.team_id)
    .eq('role', 'agent')
    .eq('status', 'active')
    .order('full_name')
  raise(error, 'Could not load agents')
  const { data: assignments, error: assignmentError } = await admin
    .from('team_assignments')
    .select('agent_id')
    .eq('team_id', member.membership.team_id)
    .eq('status', 'active')
  raise(assignmentError, 'Could not load agent workloads')
  const counts = new Map<string, number>()
  for (const assignment of assignments ?? []) counts.set(assignment.agent_id, (counts.get(assignment.agent_id) ?? 0) + 1)
  return (data ?? []).map((agent) => ({ ...agent, workload: counts.get(agent.id) ?? 0 }))
}

export async function getCountries(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_awardees')
    .select('country')
    .eq('team_id', member.membership.team_id)
    .eq('is_active', true)
    .limit(5000)
  raise(error, 'Could not load countries')
  return [...new Set((data ?? []).map((row) => row.country).filter(Boolean))].sort() as string[]
}

export async function getSettings(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_settings')
    .select('*')
    .eq('team_id', member.membership.team_id)
    .maybeSingle()
  raise(error, 'Could not load settings')
  return data
}

export async function getCommissionRules(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_commission_rules')
    .select('*')
    .eq('team_id', member.membership.team_id)
    .order('priority', { ascending: false })
  raise(error, 'Could not load commission rules')
  return data ?? []
}

export async function getCommissionEntries(
  member: SessionMember,
  options: { agentId?: string; status?: string; page?: number; pageSize?: number } = {},
) {
  const admin = createAdminClient()
  const page = Math.max(options.page ?? 1, 1)
  const pageSize = Math.min(Math.max(options.pageSize ?? 50, 1), 100)
  const from = (page - 1) * pageSize
  let query = admin
    .from('team_commission_entries')
    .select('*, team_awardees(name), team_memberships(full_name)', { count: 'exact' })
    .eq('team_id', member.membership.team_id)
  if (member.membership.role === 'agent') query = query.eq('agent_id', member.membership.id)
  else if (options.agentId) query = query.eq('agent_id', options.agentId)
  if (options.status) query = query.eq('status', options.status)
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1)
  raise(error, 'Could not load commission ledger')
  const total = count ?? 0
  return { rows: data ?? [], total, page, pageSize, pages: Math.max(Math.ceil(total / pageSize), 1) }
}

export async function getTemplates(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_templates')
    .select('*')
    .eq('team_id', member.membership.team_id)
    .order('channel')
    .order('name')
  raise(error, 'Could not load templates')
  return data ?? []
}

export async function getImports(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_import_jobs')
    .select('id, filename, status, summary, errors, mapping, created_at, committed_at')
    .eq('team_id', member.membership.team_id)
    .order('created_at', { ascending: false })
    .limit(50)
  raise(error, 'Could not load imports')
  return data ?? []
}

export async function getImportJob(member: SessionMember, jobId: string) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('team_id', member.membership.team_id)
    .maybeSingle()
  raise(error, 'Could not load import')
  return data
}

export async function getAuditLogs(
  member: SessionMember,
  options: { search?: string; page?: number } = {},
) {
  const admin = createAdminClient()
  const page = Math.max(options.page ?? 1, 1)
  const pageSize = 50
  let query = admin
    .from('team_audit_logs')
    .select('*, team_memberships(full_name,email)', { count: 'exact' })
    .eq('team_id', member.membership.team_id)
  if (options.search) {
    const search = sanitizeSearch(options.search)
    if (search) query = query.or(`action.ilike.%${search}%,entity_type.ilike.%${search}%`)
  }
  const { data, error, count } = await query
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1)
  raise(error, 'Could not load audit log')
  return { rows: data ?? [], total: count ?? 0, page, pages: Math.ceil((count ?? 0) / pageSize) }
}

export async function getPaymentReconciliation(member: SessionMember) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_payment_reconciliation')
    .select('*')
    .eq('team_id', member.membership.team_id)
    .order('award_paid_at', { ascending: false })
    .limit(300)
  raise(error, 'Could not load payment reconciliation')
  const rows = data ?? []
  return {
    rows,
    missing: rows.filter((row) => row.reconciliation_state === 'missing_commission').length,
    reconciled: rows.filter((row) => row.reconciliation_state === 'reconciled').length,
    missingReversals: rows.filter((row) => row.reconciliation_state === 'missing_reversal').length,
  }
}

export async function getReportData(member: SessionMember, from: string, to: string) {
  const admin = createAdminClient()
  const fromIso = `${from}T00:00:00.000Z`
  const toIso = `${to}T23:59:59.999Z`
  const [followups, commissions, withdrawals, agents, byCountry] = await Promise.all([
    admin
      .from('team_followups')
      .select('channel,outcome,contacted_at,agent_id')
      .eq('team_id', member.membership.team_id)
      .gte('contacted_at', fromIso)
      .lte('contacted_at', toIso),
    admin
      .from('team_commission_entries')
      .select('agent_id,entry_type,amount_minor,currency,earned_at,status')
      .eq('team_id', member.membership.team_id)
      .gte('earned_at', fromIso)
      .lte('earned_at', toIso),
    admin
      .from('team_withdrawal_requests')
      .select('agent_id,amount_minor,settled_amount_minor,currency,status,paid_at')
      .eq('team_id', member.membership.team_id)
      .eq('status', 'paid')
      .gte('paid_at', fromIso)
      .lte('paid_at', toIso),
    admin
      .from('team_memberships')
      .select('id,full_name,email,role')
      .eq('team_id', member.membership.team_id)
      .eq('status', 'active'),
    admin
      .from('team_awardee_directory')
      .select('country,payment_status,agent_id,paid_at')
      .eq('team_id', member.membership.team_id)
      .eq('is_active', true),
  ])
  raise(followups.error, 'Could not load follow-up report')
  raise(commissions.error, 'Could not load commission report')
  raise(withdrawals.error, 'Could not load payout report')
  raise(agents.error, 'Could not load agents')
  raise(byCountry.error, 'Could not load country report')

  const agentRows = (agents.data ?? []).map((agent) => {
    const agentCommissions = (commissions.data ?? []).filter((row) => row.agent_id === agent.id)
    const agentFollowups = (followups.data ?? []).filter((row) => row.agent_id === agent.id)
    const agentPayouts = (withdrawals.data ?? []).filter((row) => row.agent_id === agent.id)
    return {
      ...agent,
      followups: agentFollowups.length,
      calls: agentFollowups.filter((row) => row.channel === 'call').length,
      whatsapp: agentFollowups.filter((row) => row.channel === 'whatsapp').length,
      emails: agentFollowups.filter((row) => row.channel === 'email').length,
      commissions_minor: agentCommissions.reduce((sum, row) => sum + Number(row.amount_minor), 0),
      paid_out_minor: agentPayouts.reduce(
        (sum, row) => sum + Number(row.settled_amount_minor ?? row.amount_minor),
        0,
      ),
    }
  })

  const countries = new Map<string, { country: string; awardees: number; paid: number }>()
  for (const row of byCountry.data ?? []) {
    const key = row.country || 'Unknown'
    const current = countries.get(key) ?? { country: key, awardees: 0, paid: 0 }
    current.awardees += 1
    if (row.payment_status === 'paid') current.paid += 1
    countries.set(key, current)
  }

  return {
    from,
    to,
    totals: {
      followups: followups.data?.length ?? 0,
      commissions_minor: (commissions.data ?? [])
        .filter((row) => row.entry_type === 'earning')
        .reduce((sum, row) => sum + Number(row.amount_minor), 0),
      reversals_minor: (commissions.data ?? [])
        .filter((row) => row.entry_type === 'reversal')
        .reduce((sum, row) => sum + Number(row.amount_minor), 0),
      paid_out_minor: (withdrawals.data ?? []).reduce(
        (sum, row) => sum + Number(row.settled_amount_minor ?? row.amount_minor),
        0,
      ),
    },
    agents: agentRows,
    countries: [...countries.values()].sort((a, b) => b.awardees - a.awardees),
  }
}

export async function getEmailLogs(member: SessionMember, limit = 60) {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_email_logs')
    .select('id, to_email, subject, status, error, attempted_at, sent_at, provider_message_id, team_awardees(name, id), team_memberships(full_name)')
    .eq('team_id', member.membership.team_id)
    .order('attempted_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 200))
  raise(error, 'Could not load email log')
  return data ?? []
}

export async function getTeamContext(member: SessionMember) {  const admin = createAdminClient()
  const [settings, balance, members, notifications] = await Promise.all([
    getSettings(member),
    member.membership.role === 'agent' ? getBalance(member) : Promise.resolve(null),
    admin
      .from('team_memberships')
      .select('role,status')
      .eq('team_id', member.membership.team_id),
    admin
      .from('team_notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', member.user.id)
      .is('read_at', null),
  ])
  return {
    settings,
    balance,
    agentCount: (members.data ?? []).filter((row) => row.role === 'agent' && row.status === 'active').length,
    unread: notifications.count ?? 0,
  }
}
