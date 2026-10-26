import { createHash, randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const createSchema = z.object({ teamId: z.string().uuid() })
const revokeSchema = z.object({ teamId: z.string().uuid(), codeId: z.string().uuid() })

function makeAccessCode() {
  const raw = randomBytes(10).toString('hex').toUpperCase()
  return raw.match(/.{1,4}/g)!.join('-')
}

function digestCode(code: string) {
  return createHash('sha256').update(code.replace(/-/g, '').toUpperCase()).digest('hex')
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const teamId = request.nextUrl.searchParams.get('teamId')
  if (!z.string().uuid().safeParse(teamId).success) {
    return NextResponse.json({ message: 'Choose a team.' }, { status: 400 })
  }
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_signup_codes')
    .select('id,created_at,expires_at,revoked_at,redeemed_at,redeemed_email')
    .eq('team_id', teamId!)
    .order('created_at', { ascending: false })
    .limit(20)
  if (error) {
    console.error('[team-access-codes] Could not list codes', error.message)
    return NextResponse.json({ message: 'Could not load access codes. Apply the team access migration first.' }, { status: 500 })
  }
  return NextResponse.json({ codes: data ?? [] })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = createSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Choose a team to create a rep code.' }, { status: 400 })

  const admin = createAdminClient()
  const { data: team, error: teamError } = await admin.from('team_teams')
    .select('id,name').eq('id', parsed.data.teamId).eq('is_active', true).maybeSingle()
  if (teamError || !team) return NextResponse.json({ message: 'Active team not found.' }, { status: 404 })

  const code = makeAccessCode()
  const { data, error } = await admin.from('team_signup_codes').insert({
    team_id: team.id,
    code_hash: digestCode(code),
    created_by: auth.user.id,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  }).select('id,created_at,expires_at').single()
  if (error) {
    console.error('[team-access-codes] Could not create code', error.message)
    return NextResponse.json({ message: 'Could not create a code. Apply the team access migration first.' }, { status: 500 })
  }

  await admin.from('team_audit_logs').insert({
    team_id: team.id,
    actor_user_id: auth.user.id,
    action: 'team.signup_code_created',
    entity_type: 'signup_code',
    entity_id: data.id,
    metadata: { expires_at: data.expires_at, role: 'agent' },
  })

  return NextResponse.json({ code, record: data, message: 'Rep access code created. Copy it now; it will not be shown again.' }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = revokeSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Choose a valid access code.' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin.from('team_signup_codes')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', parsed.data.codeId).eq('team_id', parsed.data.teamId)
    .is('revoked_at', null).is('redeemed_at', null)
    .select('id').maybeSingle()
  if (error) return NextResponse.json({ message: 'Could not revoke that code.' }, { status: 500 })
  if (!data) return NextResponse.json({ message: 'That code is already used or revoked.' }, { status: 409 })
  await admin.from('team_audit_logs').insert({
    team_id: parsed.data.teamId, actor_user_id: auth.user.id,
    action: 'team.signup_code_revoked', entity_type: 'signup_code', entity_id: data.id,
  })
  return NextResponse.json({ message: 'Access code revoked.' })
}
