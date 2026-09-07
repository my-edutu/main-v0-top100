import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ jobId: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { jobId } = await params
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('enqueue_selection_job_batch', {
    p_job_id: jobId,
  })

  if (error) {
    const status = error.message.includes('still processing') ? 409 : 500
    return NextResponse.json({ message: error.message }, { status })
  }

  const batch = Array.isArray(data) ? data[0] ?? null : data
  if (!batch) {
    return NextResponse.json({ message: 'The database did not return a batch result' }, { status: 500 })
  }

  await supabase.from('selection_audit_events').insert({
    job_id: jobId,
    actor_id: adminCheck.user.id,
    event_type: 'selection_batch_enqueued',
    event_data: {
      logicalBatchNumber: batch.logical_batch_number,
      enqueuedCount: batch.enqueued_count,
      hasMore: batch.has_more,
    },
  })

  return NextResponse.json({
    jobId,
    batchNumber: batch.logical_batch_number,
    enqueuedCount: batch.enqueued_count,
    hasMore: batch.has_more,
  })
}
