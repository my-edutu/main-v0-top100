import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const inviteSchema = z.object({
  teamId: z.string().uuid(),
  fullName: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().trim().max(40).optional().default(''),
  role: z.enum(['agent', 'team_leader']),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const [{ data: teams, error: teamsError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      admin.from('team_teams').select('id,name,slug,description,is_active').order('name'),
      admin
        .from('team_memberships')
        .select('id,team_id,user_id,email,full_name,role,status,phone,joined_at')
        .order('full_name'),
    ])

  if (teamsError || membershipsError) {
    console.error('[team-operations] Could not load teams', teamsError?.message, membershipsError?.message)
    return NextResponse.json({ message: 'Could not load team operations.' }, { status: 500 })
  }

  return NextResponse.json({
    teams: (teams ?? []).map((team) => ({
      ...team,
      memberships: (memberships ?? []).filter((membership) => membership.team_id === team.id),
    })),
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const parsed = inviteSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Check the invitation details.' }, { status: 400 })

  const input = parsed.data
  const admin = createAdminClient()
  const { data: team, error: teamError } = await admin
    .from('team_teams')
    .select('id,name')
    .eq('id', input.teamId)
    .eq('is_active', true)
    .maybeSingle()
  if (teamError || !team) return NextResponse.json({ message: 'Active team not found.' }, { status: 404 })

  const { data: existing, error: lookupError } = await admin
    .from('team_memberships')
    .select('id')
    .eq('team_id', team.id)
    .ilike('email', input.email)
    .maybeSingle()
  if (lookupError) return NextResponse.json({ message: 'Could not check existing team access.' }, { status: 500 })
  if (existing) return NextResponse.json({ message: 'That email already has a membership on this team.' }, { status: 409 })

  const teamAppUrl = process.env.NEXT_PUBLIC_TEAM_PLATFORM_URL ||
    (process.env.NODE_ENV === 'development' ? 'http://localhost:3003' : 'https://teams.top100afl.com')
  const redirectTo = new URL('/auth/callback?next=/set-password', teamAppUrl).toString()
  const invitation = await admin.auth.admin.inviteUserByEmail(input.email, {
    redirectTo,
    data: { full_name: input.fullName, invited_to: team.name },
  })
  if (invitation.error) {
    return NextResponse.json(
      { message: `Invitation email could not be sent: ${invitation.error.message}` },
      { status: 502 },
    )
  }

  const { data: membership, error: insertError } = await admin
    .from('team_memberships')
    .insert({
      team_id: team.id,
      user_id: invitation.data.user.id,
      email: input.email,
      full_name: input.fullName,
      role: input.role,
      status: 'invited',
      phone: input.phone || null,
      invited_by: auth.user.id,
      invited_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[team-operations] Invitation sent but membership insert failed', insertError.message)
    return NextResponse.json(
      { message: 'The invitation email was sent, but the membership could not be saved. Please check the team access list.' },
      { status: 500 },
    )
  }

  await admin.from('team_audit_logs').insert({
    team_id: team.id,
    actor_user_id: auth.user.id,
    action: 'team.invited',
    entity_type: 'membership',
    entity_id: membership.id,
    metadata: { email: input.email, role: input.role },
  })

  return NextResponse.json({ message: `Invitation sent to ${input.email}.` }, { status: 201 })
}
