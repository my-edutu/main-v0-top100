import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import type { PayoutStatus, TeamPayout } from '@/lib/team-operations/payouts'

export const dynamic = 'force-dynamic'
const privateHeaders = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders })
const querySchema = z.object({ teamId: z.string().uuid(), page: z.coerce.number().int().min(1).max(100000).default(1), status: z.enum(['open', 'paid', 'all']).default('open') })
const statuses = ['requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'cancelled'] as const
const openStatuses = ['requested', 'under_review', 'approved', 'processing']
const pageSize = 20
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : null
const relation = (value: unknown): Record<string, unknown> => {
  const first = Array.isArray(value) ? value[0] : value
  return first && typeof first === 'object' ? first as Record<string, unknown> : {}
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
  if (!parsed.success) return json({ message: 'Choose a valid team, page and payout filter.' }, 400)
  const { teamId, page, status } = parsed.data
  try {
    const db = createAdminClient()
    const [team, actor] = await Promise.all([
      db.from('team_teams').select('id').eq('id', teamId).maybeSingle(),
      db.from('team_memberships').select('id,role,status').eq('team_id', teamId).eq('user_id', auth.user.id).maybeSingle(),
    ])
    if (team.error || actor.error) return json({ message: 'Payout access could not be checked. Please retry.' }, 503)
    if (!team.data) return json({ message: 'Team not found.' }, 404)
    const canManageTeam = actor.data?.status === 'active' && actor.data.role === 'super_admin'
    let query = db.from('team_withdrawal_requests').select('id,team_id,agent_id,amount_minor,currency,status,payout_method,payout_details,created_at,paid_at,team_memberships(full_name,user_id),team_withdrawal_payouts(transaction_reference)', { count: 'exact' }).eq('team_id', teamId)
    if (status === 'open') query = query.in('status', openStatuses)
    if (status === 'paid') query = query.eq('status', 'paid')
    const result = await query.order('created_at', { ascending: false }).order('id').range((page - 1) * pageSize, page * pageSize - 1)
    if (result.error || !result.data || result.count === null) return json({ message: 'Payout requests could not be loaded. Please retry.' }, 503)
    const requests: TeamPayout[] = result.data.map(row => {
      const amountMinor = Number(row.amount_minor)
      if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0 || !statuses.includes(row.status) || !['NGN', 'USD'].includes(row.currency)) throw new Error('Invalid payout record')
      const recipient = relation(row.team_memberships)
      const details = relation(row.payout_details)
      const isOwnRequest = row.agent_id === actor.data?.id || recipient.user_id === auth.user.id
      return {
        id: row.id, teamId: row.team_id, requesterName: text(recipient.full_name) ?? 'Team member',
        amountMinor, currency: row.currency, status: row.status as PayoutStatus, payoutMethod: row.payout_method,
        bankName: text(details.bankName) ?? text(details.bank_name), accountName: text(details.accountName) ?? text(details.account_name), accountNumber: text(details.accountNumber) ?? text(details.account_number),
        otherDestination: row.payout_method === 'paystack' ? text(details.accountEmail) : row.payout_method === 'other' ? text(details.note) : null,
        requestedAt: row.created_at, paidAt: row.paid_at, reference: text(relation(row.team_withdrawal_payouts).transaction_reference),
        isOwnRequest, canManage: canManageTeam && !isOwnRequest,
      }
    })
    return json({ requests, page, pageSize, total: result.count, canManageTeam })
  } catch { return json({ message: 'Payout requests could not be loaded. Please retry.' }, 503) }
}
