import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { isTrustedRequestOrigin } from '@/lib/security/same-origin'

export const dynamic = 'force-dynamic'
const headers = { 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' }
const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers })
const inputSchema = z.object({
  action: z.enum(['approve', 'reject', 'pay']),
  expectedStatus: z.enum(['requested', 'under_review', 'approved', 'processing', 'paid', 'rejected', 'cancelled']),
  reference: z.string().trim().max(200).optional(),
}).strict().refine(value => value.action !== 'pay' || !!value.reference, { message: 'A transfer reference is required.' })
const allowed: Record<string, string[]> = { approve: ['requested', 'under_review'], reject: ['requested', 'under_review', 'approved'], pay: ['approved', 'processing'] }

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!isTrustedRequestOrigin(request)) return json({ message: 'Cross-origin request blocked.' }, 403)
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const { id } = await context.params
  const parsed = inputSchema.safeParse(await request.json().catch(() => null))
  if (!z.string().uuid().safeParse(id).success || !parsed.success) return json({ message: 'Choose a valid payout action. Payment confirmation requires a transfer reference.' }, 400)
  try {
    const db = createAdminClient()
    const requestRow = await db.from('team_withdrawal_requests').select('id,team_id,agent_id,amount_minor,currency,status,payout_method,payout_details').eq('id', id).maybeSingle()
    if (requestRow.error) return json({ message: 'Payout request could not be loaded.' }, 503)
    if (!requestRow.data) return json({ message: 'Payout request not found.' }, 404)
    const row = requestRow.data
    const [actor, recipient] = await Promise.all([
      db.from('team_memberships').select('id,role,status').eq('team_id', row.team_id).eq('user_id', auth.user.id).maybeSingle(),
      db.from('team_memberships').select('user_id').eq('team_id', row.team_id).eq('id', row.agent_id).maybeSingle(),
    ])
    if (actor.error || recipient.error) return json({ message: 'Payout permissions could not be checked.' }, 503)
    if (!actor.data || actor.data.status !== 'active' || actor.data.role !== 'super_admin') return json({ message: 'An active administrator membership on this team is required to manage payouts.' }, 403)
    if (!recipient.data) return json({ message: 'The payout recipient could not be checked.' }, 409)
    if (actor.data.id === row.agent_id || recipient.data.user_id === auth.user.id) return json({ message: 'You cannot approve or confirm your own payout.' }, 403)
    const { action, reference, expectedStatus } = parsed.data
    if (row.status !== expectedStatus || !allowed[action].includes(row.status)) return json({ message: 'This payout status changed or the action is not available. Refresh the requests before continuing.' }, 409)
    const amount = Number(row.amount_minor)
    if (!Number.isSafeInteger(amount) || amount <= 0 || !['NGN', 'USD'].includes(row.currency)) return json({ message: 'This payout amount needs review before it can be confirmed.' }, 409)
    if (action === 'pay' && row.payout_method === 'bank_transfer') {
      const d = row.payout_details as Record<string, unknown> | null
      const present = (value: unknown) => typeof value === 'string' && !!value.trim()
      if (!d || !present(d.bankName ?? d.bank_name) || !present(d.accountName ?? d.account_name) || !present(d.accountNumber ?? d.account_number)) return json({ message: 'Complete bank details are required before confirming payment.' }, 409)
    }
    const result = await db.rpc('team_transition_withdrawal', {
      p_request_id: row.id, p_actor: auth.user.id, p_action: action,
      p_note: null, p_reference: action === 'pay' ? reference : null,
      p_paid_amount_minor: action === 'pay' ? amount : null,
    })
    if (result.error) {
      if (/ledger.*covers|balance/i.test(result.error.message)) return json({ message: 'The current commission balance no longer covers this request. Refresh and review the balance.' }, 409)
      return json({ message: 'The payout could not be updated. Refresh its status before trying again.' }, result.error.code === '42501' ? 403 : 409)
    }
    const status = action === 'pay' ? 'paid' : action === 'approve' ? 'approved' : 'rejected'
    if (result.data?.outcome !== status || result.data?.request_id !== row.id) return json({ message: 'The update could not be confirmed. Refresh the requests before trying again.' }, 503)
    return json({ ok: true, status })
  } catch { return json({ message: 'The update could not be confirmed. Refresh the requests before trying again.' }, 503) }
}
