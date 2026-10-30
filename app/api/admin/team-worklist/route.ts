import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const assignmentSchema = z.object({
  teamId: z.string().uuid(),
  year: z.number().int().min(1900).max(2100),
  defaultCountry: z.string().trim().min(2).max(80),
  maxAwardeesPerAgent: z.number().int().min(1).max(5000),
})
const settingsSchema = z.object({
  teamId: z.string().uuid(),
  defaultCountry: z.string().trim().min(2).max(80),
  maxAwardeesPerAgent: z.number().int().min(1).max(5000),
})

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error

  const admin = createAdminClient()
  const teamId = request.nextUrl.searchParams.get('teamId')
  const [
    { data: teams, error: teamsError },
    { data: members, error: membersError },
  ] = await Promise.all([
    admin
      .from('team_teams')
      .select('id,name,slug,is_active')
      .eq('is_active', true)
      .order('name'),
    admin
      .from('team_memberships')
      .select('id,team_id,full_name,email,role,status')
      .eq('status', 'active')
      .order('full_name'),
  ])
  if (teamsError || membersError) {
    console.error(
      '[team-worklist] Could not load teams or members',
      teamsError?.message,
      membersError?.message,
    )
    return NextResponse.json(
      { message: 'Could not load the team worklist.' },
      { status: 500 },
    )
  }
  if (!teamId) return NextResponse.json({ teams: teams ?? [] })

  const team = (teams ?? []).find((item) => item.id === teamId)
  if (!team)
    return NextResponse.json(
      { message: 'Active team not found.' },
      { status: 404 },
    )

  const { data: yearOptions, error: yearsError } = await admin.rpc(
    'team_awardee_year_options',
    {
      p_team_id: teamId,
      p_actor: auth.user.id,
    },
  )
  if (yearsError) {
    console.error(
      '[team-worklist] Could not load awardee years',
      yearsError.message,
    )
    return NextResponse.json(
      { message: 'Could not load the Top100 awardee years.' },
      { status: 500 },
    )
  }
  const years = (Array.isArray(yearOptions) ? yearOptions : [])
    .map(
      (item: {
        year: number | string
        total: number | string
        unpaid: number | string
      }) => ({
        year: Number(item.year),
        total: Number(item.total),
        unpaid: Number(item.unpaid),
      }),
    )
    .filter((item: { year: number }) => Number.isInteger(item.year))
  const requestedYear = Number(request.nextUrl.searchParams.get('year') ?? '')
  const selectedYear = years.some(
    (item: { year: number }) => item.year === requestedYear,
  )
    ? requestedYear
    : (years[0]?.year ?? null)

  const { data: settings, error: settingsError } = await admin
    .from('team_settings')
    .select('auto_assign_enabled,default_country,max_awardees_per_agent')
    .eq('team_id', teamId)
    .maybeSingle()
  if (settingsError || !settings) {
    console.error(
      '[team-worklist] Could not load team settings',
      settingsError?.message,
    )
    return NextResponse.json(
      {
        message:
          'Could not load worklist settings. Apply the assignment controls migration first.',
      },
      { status: 500 },
    )
  }
  let selectedCountry =
    request.nextUrl.searchParams.get('country')?.trim() ||
    settings.default_country ||
    'Nigeria'
  let countryOptions: Array<{
    country: string
    total: number
    unpaid: number
  }> = []
  if (selectedYear !== null) {
    const { data: countryData, error: countryError } = await admin.rpc(
      'team_awardee_country_options',
      { p_year: selectedYear },
    )
    if (countryError) {
      console.error(
        '[team-worklist] Could not load country options',
        countryError.message,
      )
      return NextResponse.json(
        {
          message:
            'Could not load awardee countries. Apply the assignment controls migration first.',
        },
        { status: 500 },
      )
    }
    countryOptions = (Array.isArray(countryData) ? countryData : []).map(
      (item: {
        country: string
        total: number | string
        unpaid: number | string
      }) => ({
        country: String(item.country),
        total: Number(item.total),
        unpaid: Number(item.unpaid),
      }),
    )
  }
  selectedCountry = countryOptions.find((option) => option.country.toLowerCase() === selectedCountry.toLowerCase())?.country ?? selectedCountry
  if (!countryOptions.some((option) => option.country === selectedCountry)) {
    countryOptions = [
      { country: selectedCountry, total: 0, unpaid: 0 },
      ...countryOptions,
    ]
  }

  const page = Math.max(
    Number.parseInt(request.nextUrl.searchParams.get('page') ?? '1', 10) || 1,
    1,
  )
  const search = (request.nextUrl.searchParams.get('search') ?? '')
    .replace(/[%,()*]/g, ' ')
    .trim()
    .slice(0, 80)
  const payment = request.nextUrl.searchParams.get('payment')
  let query = admin
    .from('team_awardee_directory')
    .select(
      'id,name,country,phone,email,address,payment_status,payment_source_id,payment_verified_at,public_awardee_id,profile_id,agent_id,agent_name,assigned_at,contact_status,next_followup_at',
      { count: 'exact' },
    )
    .eq('team_id', teamId)
    .eq('is_active', true)
    .order('name')
    .order('id')
    .range((page - 1) * 25, page * 25 - 1)
  if (selectedYear !== null) query = query.eq('source_year', selectedYear)
  else query = query.eq('id', '00000000-0000-0000-0000-000000000000')
  query = query.ilike('country', selectedCountry.replace(/[\\%_]/g, '\\$&'))
  if (search)
    query = query.or(
      `name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%,country.ilike.%${search}%,address.ilike.%${search}%`,
    )
  if (payment && ['paid', 'unpaid', 'pending', 'refunded'].includes(payment))
    query = query.eq('payment_status', payment)
  const assignment = request.nextUrl.searchParams.get('assignment')
  const agentId = request.nextUrl.searchParams.get('agent')
  if (assignment === 'unassigned') query = query.is('agent_id', null)
  if (assignment === 'assigned') query = query.not('agent_id', 'is', null)
  if (agentId && z.string().uuid().safeParse(agentId).success)
    query = query.eq('agent_id', agentId)
  const [
    { data: rows, error: rowsError, count },
    { data: workloads, error: workloadError },
  ] = await Promise.all([
    query,
    admin.rpc('team_active_agent_workloads', {
      p_team_id: teamId,
      p_actor: auth.user.id,
    }),
  ])
  if (rowsError || workloadError) {
    console.error(
      '[team-worklist] Could not load directory',
      rowsError?.message,
      workloadError?.message,
    )
    return NextResponse.json(
      {
        message: /source_year|schema cache/i.test(rowsError?.message ?? '')
          ? 'The worklist database update is required before this directory can load.'
          : 'Could not load awardee records.',
      },
      { status: 500 },
    )
  }
  const workloadCounts = workloads as Record<string, number> | null
  const agents = (members ?? [])
    .filter((item) => item.team_id === teamId && item.role === 'agent')
    .map((item) => ({
      ...item,
      workload: Number(workloadCounts?.[item.id] ?? 0),
    }))
  const { data: summary, error: summaryError } =
    selectedYear === null
      ? { data: null, error: null }
      : await admin.rpc('team_worklist_summary', {
          p_team_id: teamId,
          p_year: selectedYear,
          p_country: selectedCountry,
          p_actor: auth.user.id,
        })
  return NextResponse.json({
    summary: summaryError ? null : summary,
    repairRequired: Boolean(summaryError),
    team,
    teams,
    agents,
    years,
    selectedYear,
    selectedCountry,
    countryOptions,
    settings: {
      defaultCountry: settings.default_country,
      maxAwardeesPerAgent: settings.max_awardees_per_agent,
    },
    rows: rows ?? [],
    total: count ?? 0,
    page,
    pages: Math.max(Math.ceil((count ?? 0) / 25), 1),
    autoAssignEnabled: Boolean(settings.auto_assign_enabled),
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = settingsSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success)
    return NextResponse.json(
      { message: 'Choose a country and a rep capacity from 1 to 5,000.' },
      { status: 400 },
    )
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('team_settings')
    .update({
      default_country: parsed.data.defaultCountry,
      max_awardees_per_agent: parsed.data.maxAwardeesPerAgent,
      updated_by: auth.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq('team_id', parsed.data.teamId)
    .select('default_country,max_awardees_per_agent')
    .maybeSingle()
  if (error || !data) {
    console.error(
      '[team-worklist] Could not save assignment settings',
      error?.message,
    )
    return NextResponse.json(
      {
        message:
          'Could not save worklist settings. Apply the assignment controls migration first.',
      },
      { status: 500 },
    )
  }
  await admin.from('team_audit_logs').insert({
    team_id: parsed.data.teamId,
    actor_user_id: auth.user.id,
    action: 'team.worklist_settings_updated',
    entity_type: 'team_settings',
    entity_id: parsed.data.teamId,
    metadata: data,
  })
  return NextResponse.json({
    settings: {
      defaultCountry: data.default_country,
      maxAwardeesPerAgent: data.max_awardees_per_agent,
    },
  })
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('error' in auth) return auth.error
  const parsed = assignmentSchema.safeParse(
    await request.json().catch(() => null),
  )
  if (!parsed.success)
    return NextResponse.json(
      { message: 'Check the assignment settings.' },
      { status: 400 },
    )
  const admin = createAdminClient()
  const { data, error } = await admin.rpc('team_distribute_awardee_year', {
    p_team_id: parsed.data.teamId,
    p_year: parsed.data.year,
    p_country: parsed.data.defaultCountry,
    p_capacity: parsed.data.maxAwardeesPerAgent,
    p_actor: auth.user.id,
  })
  if (error) {
    console.error('[team-worklist] Assignment run failed', error.message)
    return NextResponse.json(
      {
        message: /schema cache|does not exist/i.test(error.message)
          ? 'The worklist database update is required before distributing awardees.'
          : error.message,
      },
      { status: 400 },
    )
  }
  return NextResponse.json({ result: data })
}
