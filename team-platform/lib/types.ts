export type Role = 'super_admin' | 'team_leader' | 'agent'

export type Membership = {
  id: string
  team_id: string
  user_id: string | null
  email: string
  full_name: string
  role: Role
  status: 'invited' | 'active' | 'suspended'
  phone: string | null
  joined_at: string | null
}

export type Team = {
  id: string
  name: string
  slug: string
  description: string | null
}

export type SessionMember = {
  user: {
    id: string
    email: string
  }
  membership: Membership
  team: Team
}

export type Balance = {
  currency: string
  confirmed_earned_minor: number
  available_balance_minor: number
  pending_commission_minor: number
  pending_withdrawal_minor: number
  withdrawn_minor: number
  total_earned_minor: number
  withdrawable_minor: number
}

export type AgentDashboard = {
  role: Role
  assigned: number
  contacted: number
  not_contacted: number
  paid: number
  unpaid: number
  pending_verification: number
  due_today: number
  overdue: number
  conversion_rate: number
  balance: Balance
  recent_activity: Array<{
    id: string
    channel: string
    outcome: string
    notes: string | null
    contacted_at: string
    awardee_name: string
    awardee_id: string
  }>
  recent_commissions: Array<{
    id: string
    amount_minor: number
    currency: string
    entry_type: string
    status: string
    earned_at: string
    awardee_name: string
  }>
  recent_withdrawals: Array<{
    id: string
    amount_minor: number
    settled_amount_minor: number | null
    currency: string
    status: string
    created_at: string
    paid_at: string | null
    transaction_reference: string | null
  }>
}

export type AdminDashboard = {
  role: Role
  total_awardees: number
  assigned: number
  unassigned: number
  paid: number
  unpaid: number
  pending_verification: number
  active_agents: number
  commissions_generated_minor: number
  confirmed_commissions_minor: number
  pending_commissions_minor: number
  outstanding_liability_minor: number
  withdrawn_minor: number
  withdrawal_queue: number
  conversion_rate: number
  ranking: Array<{
    id: string
    full_name: string
    email: string
    assigned: number
    contacted: number
    paid: number
    conversion_rate: number
  }>
  activity: Array<{ day: string; followups: number; commissions: number }>
  countries: Array<{ country: string; awardees: number; paid: number }>
}
