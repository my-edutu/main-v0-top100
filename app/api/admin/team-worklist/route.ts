import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const assignmentSchema = z.object({
  teamId: z.string().uuid(),
  year: z.number().int().min(1900).max(2100),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const teamId = request.nextUrl.searchParams.get('teamId')
  const [{ data: teams, error: teamsError }, { data: members, error: membersError }] = await Promise.all([
    admin.from('team_teams').select('id,name,slug,is_active').eq('is_active', true).order('name'),
    admin.from('team_memberships').select('id,team_id,full_name,email,role,status').eq('status', 'active').order('full_name'),
  ])
  if (teamsError || membersError) {
    console.error('[team-worklist] Could not load teams or members', teamsError?.message, membersError?.message)
    return NextResponse.json({ message: 'Could not load the team worklist.' }, { status: 500 })
  }
  if (!teamId) return NextResponse.json({ teams: teams ?? [] })

  const team = (teams ?? []).find((item) => item.id === teamId)
  if (!team) return NextResponse.json({ message: 'Active team not found.' }, { status: 404 })

  const { data: yearOptions, error: yearsError } = await admin.rpc('team_awardee_year_options', {
    p_team_id: teamId,
    p_actor: auth.user.id,
  })
  if (yearsError) {
    console.error('[team-worklist] Could not load awardee years', yearsError.message)
    return NextResponse.json({ message: 'Could not load the Top100 awardee years.' }, { status: 500 })
  }
  const years = (Array.isArray(yearOptions) ? yearOptions : []).map((item: { year: number | string; total: number | string; unpaid: number | string }) => ({
    year: Number(item.year),
    total: Number(item.total),
    unpaid: Number(item.unpaid),
  })).filter((item: { year: number }) => Number.isInteger(item.year))
  const requestedYear = Number.parseInt(request.nextUrl.searchParams.get('year') ?? '', 10)
  const selectedYear = years.some((item: { year: number }) => item.year === requestedYear)
    ? requestedYear
    : years[0]?.year ?? null

  const page = Math.max(Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1, 1)
  const search = (request.nextUrl.searchParams.get('search') ?? '').replace(/[%,()*]/g, ' ').trim().slice(0, 80)
  const payment = request.nextUrl.searchParams.get('payment')
  let query = admin.from('team_awardees')
    .select('id,name,country,phone,email,address,payment_status,payment_source_id,payment_verified_at,public_awardee_id,profile_id', { count: 'exact' })
    .eq('team_id', teamId).eq('is_active', true).order('name').range((page - 1) * 25, page * 25 - 1)
  if (selectedYear !== null) query = query.eq('source_year', selectedYear)
  else query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  if (search) query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,country.ilike.%${search}%,address.ilike.%${search}%`)
  if (payment && ['paid', 'unpaid', 'pending', 'refunded'].includes(payment)) query = query.eq('payment_status', payment)
  const [{ data: rows, error: rowsError, count }, { data: workloads, error: workloadError }, { data: settings, error: settingsError }] = await Promise.all([
    query,
    admin.rpc('team_active_agent_workloads', { p_team_id: teamId, p_actor: auth.user.id }),
    admin.from('team_settings').select('auto_assign_enabled').eq('team_id', teamId).maybeSingle(),
  ])
  if (rowsError || workloadError || settingsError) {
    console.error('[team-worklist] Could not load directory', rowsError?.message, workloadError?.message, settingsError?.message)
    return NextResponse.json({ message: 'Could not load awardee records.' }, { status: 500 })
  }
  const workloadCounts = workloads as Record<string, number> | null
  const agents = (members ?? []).filter((item) => item.team_id === teamId && item.role === 'agent').map((item) => ({ ...item, workload: Number(workloadCounts?.[item.id] ?? 0) }))
  return NextResponse.json({ team, teams, agents, years, selectedYear, rows: rows ?? [], total: count ?? 0, page, pages: Math.max(Math.ceil((count ?? 0) / 25), 1), autoAssignEnabled: Boolean(settings?.auto_assign_enabled) })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = assignmentSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ message: 'Check the assignment settings.' }, { status: 400 })
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('team_assign_from_awardee_year', {
    p_team_id: parsed.data.teamId,
    p_year: parsed.data.year,
    p_actor: auth.user.id,
  })
  if (error) {
    console.error('[team-worklist] Assignment run failed', error.message)
    return NextResponse.json({ message: error.message }, { status: 400 })
  }
  return NextResponse.json({ result: data })
}
