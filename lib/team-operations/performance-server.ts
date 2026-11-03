import type { SupabaseClient } from '@supabase/supabase-js'
import { buildTeamPerformance, type PerformanceMember, type PerformanceAwardee, type PerformanceAssignment, type PerformanceAttribution, type PerformanceCommission, type TeamPerformance } from './performance'

const PAGE_SIZE = 500

async function readTeamRows<T>(admin: SupabaseClient, table: string, columns: string, teamIds: string[]): Promise<T[]> {
  const rows: T[] = []
  for (let offset = 0; ; offset += PAGE_SIZE) {
    let query = admin.from(table).select(columns).in('team_id', teamIds).order('id')
    // One projection may have multiple historical source payments in the view.
    // Use a total order so pagination cannot skip equal projection IDs.
    if (table === 'team_payment_attributions') query = query.order('payment_id').order('team_id')
    const { data, error } = await query.range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`Could not read ${table}: ${error.message}`)
    if (!data) throw new Error(`No response from ${table}`)
    rows.push(...data as T[])
    if (data.length < PAGE_SIZE) return rows
  }
}

export async function loadTeamPerformance(admin: SupabaseClient, memberships: PerformanceMember[]): Promise<TeamPerformance> {
  const teamIds = [...new Set(memberships.map(member => member.team_id))]
  if (!teamIds.length) return buildTeamPerformance([], [], [], [])
  const [awardees, assignments, commissions, attributions] = await Promise.all([
    readTeamRows<PerformanceAwardee>(admin, 'team_awardees', 'id,team_id,is_active,payment_status,payment_currency,payment_amount_minor,paid_at,payment_verified_at,payment_source_type,payment_source_id', teamIds),
    readTeamRows<PerformanceAssignment>(admin, 'team_assignments', 'id,team_id,awardee_id,agent_id,status,assigned_at,ended_at', teamIds),
    readTeamRows<PerformanceCommission>(admin, 'team_commission_entries', 'id,team_id,agent_id,amount_minor,currency,status', teamIds),
    readTeamRows<PerformanceAttribution>(admin, 'team_payment_attributions', 'id,team_id,awardee_id,agent_id,assignment_id,payment_id,contact_kind', teamIds),
  ])
  return buildTeamPerformance(memberships, awardees, assignments, commissions, attributions)
}
