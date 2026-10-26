import { NextResponse } from 'next/server'
import { ApiError, apiAdmin, audit, jsonError } from '@/lib/api'
import { createAdminClient } from '@/lib/supabase/admin'
import { templateSchema } from '@/lib/validation'

export const dynamic = 'force-dynamic'

function payloadOf(input: ReturnType<typeof templateSchema.parse>) {
  return {
    channel: input.channel,
    name: input.name,
    subject: input.subject?.trim() || null,
    body: input.body,
    is_active: input.isActive,
  }
}

export async function POST(request: Request) {
  try {
    const member = await apiAdmin()
    const payload = templateSchema.parse(await request.json())
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('team_templates')
      .insert({
        team_id: member.membership.team_id,
        ...payloadOf(payload),
        created_by: member.user.id,
      })
      .select('*')
      .single()
    if (error?.code === '23505') throw new ApiError('A template with that name already exists', 409)
    if (error) throw new ApiError(`Could not create the template: ${error.message}`, 500)

    await audit(member, 'template.created', 'template', data.id, payloadOf(payload))
    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const member = await apiAdmin()
    const body = await request.json()
    const payload = templateSchema.parse(body)
    const id = typeof body?.id === 'string' ? body.id : payload.id
    if (!id) throw new ApiError('Template ID is required')

    const admin = createAdminClient()
    const { data: existing, error: existingError } = await admin
      .from('team_templates')
      .select('*')
      .eq('id', id)
      .eq('team_id', member.membership.team_id)
      .maybeSingle()
    if (existingError) throw new ApiError('Could not load the template', 500)
    if (!existing) throw new ApiError('Template not found', 404)

    const { data, error } = await admin
      .from('team_templates')
      .update(payloadOf(payload))
      .eq('id', id)
      .select('*')
      .single()
    if (error?.code === '23505') throw new ApiError('A template with that name already exists', 409)
    if (error) throw new ApiError(`Could not update the template: ${error.message}`, 500)

    await audit(member, 'template.updated', 'template', id, {
      before: { name: existing.name, channel: existing.channel, is_active: existing.is_active },
      after: payloadOf(payload),
    })
    return NextResponse.json({ template: data })
  } catch (error) {
    return jsonError(error)
  }
}
