import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ runId: string }>
}

const runIdSchema = z.string().uuid()
const pageSchema = z.object({
  page: z.coerce.number().int().min(1).max(100_000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(100),
})

export async function GET(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const parsedRunId = runIdSchema.safeParse((await params).runId)
  if (!parsedRunId.success) {
    return NextResponse.json({ message: 'Invalid ranking run identifier' }, { status: 400 })
  }

  const parsedPage = pageSchema.safeParse({
    page: request.nextUrl.searchParams.get('page') ?? 1,
    pageSize: request.nextUrl.searchParams.get('pageSize') ?? 100,
  })
  if (!parsedPage.success) {
    return NextResponse.json({ message: 'Invalid ranking page request' }, { status: 400 })
  }

  const { page, pageSize } = parsedPage.data
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const runId = parsedRunId.data
  const supabase = createAdminClient()

  const { data: run, error: runError } = await supabase
    .from('selection_ranking_runs')
    .select(
      'id, cycle_id, name, policy_version, status, winner_target, reserve_target, eligible_count, proposed_winner_count, reserve_count, countries_represented, input_checksum, ranking_method, created_by, frozen_by, frozen_at, approved_at, published_at, created_at, updated_at, selection_cycles(name, year), selection_ranking_approvals(id, approver_id, decision, notes, created_at)',
    )
    .eq('id', runId)
    .maybeSingle()

  if (runError) {
    return NextResponse.json({ message: runError.message }, { status: 500 })
  }
  if (!run) {
    return NextResponse.json({ message: 'Ranking run not found' }, { status: 404 })
  }

  const {
    data: entries,
    error: entriesError,
    count,
  } = await supabase
    .from('selection_ranking_entries')
    .select(
      'id, application_id, assessment_id, country, overall_rank, country_rank, total_score, score_breakdown, selection_status, rank_explanation, created_at, selection_applications(full_name, primary_email, institution, course)',
      { count: 'exact' },
    )
    .eq('run_id', runId)
    .order('overall_rank', { ascending: true })
    .range(from, to)

  if (entriesError) {
    return NextResponse.json({ message: entriesError.message }, { status: 500 })
  }

  return NextResponse.json({
    run,
    entries: entries ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      pageCount: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  })
}
