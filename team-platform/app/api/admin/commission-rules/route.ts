import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, audit, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { commissionRuleSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

function rulePayload(payload: ReturnType<typeof commissionRuleSchema.parse>) {
  return {
    name: payload.name,
    payment_currency: payload.paymentCurrency,
    commission_currency: payload.commissionCurrency,
    commission_amount_minor: payload.commissionAmountMinor,
    country_scope: payload.countryScope?.trim() || null,
    priority: payload.priority,
    is_active: payload.isActive,
  }
}

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const payload = commissionRuleSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('team_commission_rules')
      .insert({
        team_id: member.membership.team_id,
        ...rulePayload(payload),
        created_by: member.user.id,
      })
      .select('*')
      .single()
    if (error) throw new ApiError(`Could not create the commission rule: ${error.message}`, 500)

    await audit(member, 'commission_rule.created', 'commission_rule', data.id, rulePayload(payload))
    return NextResponse.json({ rule: data }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const member = await apiAdmin()
    const body = await request.json()
    const id = typeof body?.id === 'string' ? body.id : ''
    if (!id) throw new ApiError('Rule ID is required')
    const payload = commissionRuleSchema.parse(body)
    const admin = createAdminClient()

    const { data: existing, error: existingError } = await admin
      .from('team_commission_rules')
      .select('*')
      .eq('id', id)
      .eq('team_id', member.membership.team_id)
      .maybeSingle()
    if (existingError) throw new ApiError('Could not load the rule', 500)
    if (!existing) throw new ApiError('Commission rule not found', 404)

    const { data, error } = await admin
      .from('team_commission_rules')
      .update(rulePayload(payload))
      .eq('id', id)
      .select('*')
      .single()
    if (error) throw new ApiError(`Could not update the commission rule: ${error.message}`, 500)

    await audit(member, 'commission_rule.updated', 'commission_rule', id, {
      before: existing,
      after: rulePayload(payload),
    })
    return NextResponse.json({ rule: data })
  } catch (error) {
    return jsonError(error)
  }
}
