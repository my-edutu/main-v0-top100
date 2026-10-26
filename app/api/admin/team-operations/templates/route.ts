import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const templateSchema = z.object({
  id: z.string().uuid().optional(),
  teamId: z.string().uuid(),
  channel: z.enum(['email', 'whatsapp']),
  name: z.string().trim().min(2).max(120),
  subject: z.string().trim().max(200).nullable().optional(),
  body: z.string().trim().min(10).max(20_000),
  isActive: z.boolean().default(true),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const teamId = request.nextUrl.searchParams.get('teamId')
  const { data: teams, error: teamsError } = await admin.from('team_teams').select('id,name').eq('is_active', true).order('name')
  if (teamsError) {
    console.error('[team-templates] Could not load teams', teamsError.message)
    return NextResponse.json({ message: 'Could not load team email templates.' }, { status: 500 })
  }
  if (teamId && !(teams ?? []).some((team) => team.id === teamId)) {
    return NextResponse.json({ message: 'Active team not found.' }, { status: 404 })
  }
  const { data: templates, error: templatesError } = teamId
    ? await admin.from('team_templates').select('*').eq('team_id', teamId).order('channel').order('name')
    : { data: [], error: null }
  if (templatesError) {
    console.error('[team-templates] Could not load templates', templatesError.message)
    return NextResponse.json({ message: 'Could not load team email templates.' }, { status: 500 })
  }
  return NextResponse.json({ teams: teams ?? [], templates: templates ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = templateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Check the template details.' }, { status: 400 })

  const { teamId, channel, name, subject, body, isActive } = parsed.data
  const admin = createAdminClient()
  const { data, error } = await admin.from('team_templates').insert({
    team_id: teamId, channel, name, subject: channel === 'email' ? subject || null : null,
    body, is_active: isActive, created_by: auth.user.id,
  }).select('*').single()
  if (error?.code === '23505') return NextResponse.json({ message: 'A template with that name already exists.' }, { status: 409 })
  if (error) {
    console.error('[team-templates] Create failed', error.message)
    return NextResponse.json({ message: 'Could not create the template.' }, { status: 500 })
  }
  await admin.from('team_audit_logs').insert({ team_id: teamId, actor_user_id: auth.user.id, action: 'template.created', entity_type: 'template', entity_id: data.id, metadata: { name, channel } })
  return NextResponse.json({ template: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = templateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || !parsed.data.id) return NextResponse.json({ message: 'Check the template details.' }, { status: 400 })

  const { id, teamId, channel, name, subject, body, isActive } = parsed.data
  const admin = createAdminClient()
  const { data, error } = await admin.from('team_templates').update({
    channel, name, subject: channel === 'email' ? subject || null : null, body, is_active: isActive,
  }).eq('id', id).eq('team_id', teamId).select('*').maybeSingle()
  if (error?.code === '23505') return NextResponse.json({ message: 'A template with that name already exists.' }, { status: 409 })
  if (error) {
    console.error('[team-templates] Update failed', error.message)
    return NextResponse.json({ message: 'Could not update the template.' }, { status: 500 })
  }
  if (!data) return NextResponse.json({ message: 'Template not found.' }, { status: 404 })
  await admin.from('team_audit_logs').insert({ team_id: teamId, actor_user_id: auth.user.id, action: 'template.updated', entity_type: 'template', entity_id: id, metadata: { name, channel, isActive } })
  return NextResponse.json({ template: data })
}
