import { NextResponse } from 'next/server'
import { z } from 'zod'
import { ApiError, apiMember, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { assertSameOrigin } from '@/app/api/contact-attempts/route'

export const dynamic = 'force-dynamic'
const schema = z.object({ awardeeId: z.string().uuid(), expectedPhone: z.string().regex(/^\+[1-9]\d{7,14}$/), unavailable: z.boolean() }).strict()

export async function POST(request: Request) {
  try {
    assertSameOrigin(request)
    const member = await apiMember()
    if (member.membership.role !== 'agent') throw new ApiError('Only the assigned rep can update this report', 403)
    const input = schema.parse(await request.json())
    const { data, error } = await createAdminClient().rpc('team_set_whatsapp_unavailable', {
      p_team_id: member.membership.team_id, p_actor: member.user.id,
      p_awardee_id: input.awardeeId, p_expected_phone: input.expectedPhone, p_unavailable: input.unavailable,
    })
    if (error) throw new ApiError(error.code === '42501' ? 'This awardee is not assigned to you' : error.code === '22023' ? 'The phone number or report details changed. Refresh and check this awardee before trying again.' : 'Could not save the WhatsApp report', error.code === '42501' ? 403 : error.code === '22023' ? 409 : 503)
    if (!data || typeof data !== 'object' || !('report' in data) || (input.unavailable ? data.report?.source !== 'rep_reported' || data.report?.phone !== input.expectedPhone || typeof data.report?.reported_at !== 'string' || Number.isNaN(Date.parse(data.report.reported_at)) : data.report !== null)) throw new ApiError('The saved report could not be confirmed. Refresh before trying again.', 503)
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) { return jsonError(error) }
}
