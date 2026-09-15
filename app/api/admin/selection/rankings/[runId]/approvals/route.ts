import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ runId: string }>
}

const runIdSchema = z.string().uuid()
const approvalSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  notes: z.string().trim().min(10).max(4_000),
})

export async function POST(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const parsedRunId = runIdSchema.safeParse((await params).runId)
  if (!parsedRunId.success) {
    return NextResponse.json({ message: 'Invalid ranking run identifier' }, { status: 400 })
  }

  let input: z.infer<typeof approvalSchema>
  try {
    input = approvalSchema.parse(await request.json())
  } catch (error) {
    return NextResponse.json(
      {
        message: 'Choose approve or reject and provide a note of at least 10 characters.',
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    )
  }

  const runId = parsedRunId.data
  const supabase = createAdminClient()
  const { data: run, error: runError } = await supabase
    .from('selection_ranking_runs')
    .select('id, cycle_id, status')
    .eq('id', runId)
    .maybeSingle()

  if (runError) {
    return NextResponse.json({ message: runError.message }, { status: 500 })
  }
  if (!run) {
    return NextResponse.json({ message: 'Ranking run not found' }, { status: 404 })
  }
  if (run.status !== 'frozen') {
    return NextResponse.json(
      {
        message:
          run.status === 'approved'
            ? 'This ranking run already has the required approvals.'
            : 'Only a frozen ranking run can receive a committee decision.',
      },
      { status: 409 },
    )
  }

  const { error: insertError } = await supabase.from('selection_ranking_approvals').insert({
    run_id: runId,
    approver_id: adminCheck.user.id,
    decision: input.decision,
    notes: input.notes,
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json(
        { message: 'You already recorded a decision for this ranking run.' },
        { status: 409 },
      )
    }
    return NextResponse.json({ message: insertError.message }, { status: 500 })
  }

  const { data: updatedRun, error: refreshError } = await supabase
    .from('selection_ranking_runs')
    .select(
      'id, status, approved_at, selection_ranking_approvals(id, approver_id, decision, notes, created_at)',
    )
    .eq('id', runId)
    .single()

  if (refreshError || !updatedRun) {
    return NextResponse.json(
      { message: refreshError?.message || 'The decision was saved but could not be reloaded.' },
      { status: 500 },
    )
  }

  await supabase.from('selection_audit_events').insert({
    cycle_id: run.cycle_id,
    actor_id: adminCheck.user.id,
    event_type: 'selection_ranking_decision_recorded',
    event_data: {
      runId,
      decision: input.decision,
      resultingStatus: updatedRun.status,
    },
  })

  return NextResponse.json(
    {
      run: updatedRun,
      message:
        input.decision === 'reject'
          ? 'The ranking run was rejected and voided.'
          : updatedRun.status === 'approved'
            ? 'The second independent approval was recorded. The ranking run is approved.'
            : 'Approval recorded. One more independent administrator must approve this run.',
    },
    { status: 201 },
  )
}
