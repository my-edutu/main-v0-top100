import { createHash } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { SELECTION_PDF_MAX_BYTES } from '@/lib/selection/contracts'
import { hasPdfMagicBytes } from '@/lib/selection/upload'

export const runtime = 'nodejs'

const bodySchema = z.object({
  documentId: z.string().uuid(),
})

type RouteContext = {
  params: Promise<{ jobId: string; applicationId: string }>
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { jobId, applicationId } = await params
  let documentId: string
  try {
    documentId = bodySchema.parse(await request.json()).documentId
  } catch (error) {
    return NextResponse.json(
      {
        message: 'A valid documentId is required',
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: document, error: documentError } = await supabase
    .from('selection_documents')
    .select('id, application_id, job_id, storage_path, original_name, size_bytes')
    .eq('id', documentId)
    .eq('application_id', applicationId)
    .eq('job_id', jobId)
    .single()

  if (documentError || !document) {
    return NextResponse.json({ message: 'Evidence record not found' }, { status: 404 })
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from('selection-evidence')
    .download(document.storage_path)

  if (downloadError || !blob) {
    return NextResponse.json(
      { message: downloadError?.message || 'The PDF has not been uploaded yet' },
      { status: 409 },
    )
  }

  const bytes = Buffer.from(await blob.arrayBuffer())
  let validationError: string | null = null
  if (bytes.length === 0) validationError = 'The uploaded PDF is empty'
  else if (bytes.length > SELECTION_PDF_MAX_BYTES) validationError = 'PDF evidence must not exceed 25MB'
  else if (!hasPdfMagicBytes(bytes)) validationError = 'The uploaded file is not a valid PDF document'

  if (validationError) {
    await supabase
      .from('selection_documents')
      .update({ extraction_status: 'failed', last_error: validationError })
      .eq('id', documentId)

    await supabase.from('selection_audit_events').insert({
      job_id: jobId,
      application_id: applicationId,
      actor_id: adminCheck.user.id,
      event_type: 'evidence_upload_rejected',
      event_data: { documentId, reason: validationError, actualBytes: bytes.length },
    })

    return NextResponse.json({ message: validationError }, { status: 400 })
  }

  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const sizeMismatch = Number(document.size_bytes) !== bytes.length
  const { data: savedDocument, error: updateError } = await supabase
    .from('selection_documents')
    .update({
      size_bytes: bytes.length,
      sha256,
      extraction_status: 'pending',
      last_error: null,
      integrity_flags: sizeMismatch ? ['DECLARED_FILE_SIZE_MISMATCH'] : [],
    })
    .eq('id', documentId)
    .select('id, original_name, size_bytes, sha256, extraction_status, integrity_flags')
    .single()

  if (updateError || !savedDocument) {
    return NextResponse.json(
      { message: updateError?.message || 'Failed to confirm the uploaded evidence' },
      { status: 500 },
    )
  }

  const { count, error: countError } = await supabase
    .from('selection_applications')
    .select('id', { count: 'exact', head: true })
    .eq('job_id', jobId)

  if (countError) {
    return NextResponse.json({ message: countError.message }, { status: 500 })
  }

  const { error: jobUpdateError } = await supabase
    .from('selection_jobs')
    .update({ total_count: count ?? 0, status: 'ready', last_error: null })
    .eq('id', jobId)
    .neq('status', 'processing')

  if (jobUpdateError) {
    return NextResponse.json({ message: jobUpdateError.message }, { status: 500 })
  }

  await supabase.from('selection_audit_events').insert({
    job_id: jobId,
    application_id: applicationId,
    actor_id: adminCheck.user.id,
    event_type: 'evidence_upload_confirmed',
    event_data: {
      documentId,
      sha256,
      actualBytes: bytes.length,
      declaredBytes: Number(document.size_bytes),
      sizeMismatch,
    },
  })

  return NextResponse.json({
    applicationId,
    document: savedDocument,
    job: { id: jobId, totalCount: count ?? 0 },
  })
}
