import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type RouteContext = {
  params: Promise<{ applicationId: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { applicationId } = await params
  const supabase = createAdminClient()
  const { data: result, error: resultError } = await supabase
    .from('selection_public_results')
    .select('id, access_token, payload, assessment_id, selection_assessments(verdict, requires_human_review), selection_applications(job_id, cycle_id, primary_email)')
    .eq('application_id', applicationId)
    .single()

  if (resultError || !result) {
    return NextResponse.json({ message: 'Applicant result not found' }, { status: 404 })
  }

  const assessment = Array.isArray(result.selection_assessments)
    ? result.selection_assessments[0] ?? null
    : result.selection_assessments
  const application = Array.isArray(result.selection_applications)
    ? result.selection_applications[0] ?? null
    : result.selection_applications

  if (!assessment || assessment.requires_human_review || assessment.verdict === 'needs_review') {
    return NextResponse.json(
      { message: 'A result that still requires human review cannot be published.' },
      { status: 409 },
    )
  }

  const publishedAt = new Date().toISOString()
  const payload = {
    ...(result.payload && typeof result.payload === 'object' ? result.payload : {}),
    publishedAt,
    isFinal: true,
  }
  const { data: published, error: publishError } = await supabase
    .from('selection_public_results')
    .update({
      payload,
      is_published: true,
      published_at: publishedAt,
    })
    .eq('id', result.id)
    .select('access_token, published_at')
    .single()

  if (publishError || !published) {
    return NextResponse.json(
      { message: publishError?.message || 'Failed to publish the applicant result' },
      { status: 500 },
    )
  }

  await supabase.from('selection_audit_events').insert({
    cycle_id: application?.cycle_id ?? null,
    job_id: application?.job_id ?? null,
    application_id: applicationId,
    actor_id: adminCheck.user.id,
    event_type: 'applicant_result_published',
    event_data: {
      verdict: assessment.verdict,
      primaryEmailPresent: Boolean(application?.primary_email),
      publishedAt,
    },
  })

  return NextResponse.json({
    applicationId,
    accessToken: published.access_token,
    resultPath: `/selection-results/${published.access_token}`,
    publishedAt: published.published_at,
  })
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { applicationId } = await params
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('selection_public_results')
    .update({ is_published: false, published_at: null })
    .eq('application_id', applicationId)

  if (error) return NextResponse.json({ message: error.message }, { status: 500 })

  await supabase.from('selection_audit_events').insert({
    application_id: applicationId,
    actor_id: adminCheck.user.id,
    event_type: 'applicant_result_unpublished',
  })

  return NextResponse.json({ applicationId, published: false })
}
