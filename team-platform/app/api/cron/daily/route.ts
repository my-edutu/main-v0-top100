import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function authorized(request: Request) {
  if (!env.cronSecret) return false
  const bearer = request.headers.get('authorization') ?? ''
  const header = request.headers.get('x-cron-secret') ?? ''
  return bearer === `Bearer ${env.cronSecret}` || header === env.cronSecret
}

async function run(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json(
      { error: env.cronSecret ? 'Unauthorized' : 'Cron is not configured' },
      { status: env.cronSecret ? 401 : 503 },
    )
  }

  const admin = createAdminClient()
  const { data: teams, error } = await admin
    .from('team_teams')
    .select('id, name')
    .eq('is_active', true)
  if (error) {
    return NextResponse.json({ error: 'Could not load teams' }, { status: 500 })
  }

  const results: Array<Record<string, unknown>> = []
  for (const team of teams ?? []) {
    const { data: refreshed, error: refreshError } = await admin.rpc('team_refresh_followup_states', {
      p_team_id: team.id,
    })
    const row: Record<string, unknown> = {
      team: team.name,
      followup_states_refreshed: refreshError ? null : refreshed,
      refresh_error: refreshError?.message ?? null,
    }

    if (env.cronActorId) {
      const { data: reconciled, error: reconcileError } = await admin.rpc('team_reconcile_payments', {
        p_team_id: team.id,
        p_actor: env.cronActorId,
        p_limit: 500,
      })
      row.reconciliation = reconcileError ? { error: reconcileError.message } : reconciled
    } else {
      row.reconciliation = 'skipped: TEAM_CRON_ACTOR_ID is not set'
    }

    results.push(row)
  }

  const { data: released, error: releaseError } = await admin.rpc('team_release_commissions')

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    teams: results,
    commissionsReleased: releaseError ? null : released,
    releaseError: releaseError?.message ?? null,
  })
}

export async function GET(request: Request) {
  return run(request)
}

export async function POST(request: Request) {
  return run(request)
}
