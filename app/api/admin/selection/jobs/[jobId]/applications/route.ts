import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import { validateSelectionPdfUpload } from '@/lib/selection/source'
import { buildSelectionEvidencePath } from '@/lib/selection/upload'

export const runtime = 'nodejs'

const createApplicationSchema = z.object({
  fullName: z.string().trim().min(2).max(200),
  primaryEmail: z.union([z.string().trim().email(), z.literal('')]).optional().default(''),
  secondaryEmail: z.union([z.string().trim().email(), z.literal('')]).optional().default(''),
  phone: z.string().trim().max(60).optional().default(''),
  country: z.string().trim().max(120).optional().default(''),
  institution: z.string().trim().max(240).optional().default(''),
  course: z.string().trim().max(240).optional().default(''),
  graduationYear: z.number().int().min(1950).max(2200).nullable().optional().default(null),
  claimedCgpa: z.string().trim().max(60).optional().default(''),
  claimedAcademicStatus: z.string().trim().max(160).optional().default(''),
  leadershipNarrative: z.string().trim().max(20_000).optional().default(''),
  declarationConfirmed: z.boolean().optional().default(false),
  fileName: z.string().trim().min(1).max(220),
  fileSize: z.number().int().positive(),
  mimeType: z.string().trim().min(1).max(120),
})

type RouteContext = {
  params: Promise<{ jobId: string }>
}

const nullable = (value: string) => value || null

export async function GET(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { jobId } = await params
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1)
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('pageSize') || '50', 10) || 50))
  const search = searchParams.get('search')?.trim() || ''
  const status = searchParams.get('status')?.trim() || ''
  const start = (page - 1) * pageSize
  const end = start + pageSize - 1

  const supabase = createAdminClient()
  let query = supabase
    .from('selection_applications')
    .select(
      'id, source_record_id, source_submitted_at, full_name, primary_email, country, institution, course, graduation_year, claimed_cgpa, claimed_academic_status, status, created_at, updated_at, selection_assessments(verdict, total_score, score_breakdown, reason_codes, public_reasons, requires_human_review, policy_version), selection_documents(id, original_name, size_bytes, sha256, extraction_status, extraction_confidence, integrity_flags)',
      { count: 'exact' },
    )
    .eq('job_id', jobId)
    .order('created_at', { ascending: true })
    .range(start, end)

  if (search) {
    const escaped = search.replace(/[%_,]/g, ' ')
    query = query.or(
      `full_name.ilike.%${escaped}%,primary_email.ilike.%${escaped}%,country.ilike.%${escaped}%,institution.ilike.%${escaped}%`,
    )
  }
  if (status) query = query.eq('status', status)

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }

  return NextResponse.json({
    applications: data ?? [],
    pagination: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  })
}

export async function POST(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { jobId } = await params
  let input: z.infer<typeof createApplicationSchema>
  try {
    input = createApplicationSchema.parse(await request.json())
    validateSelectionPdfUpload({
      name: input.fileName,
      type: input.mimeType,
      size: input.fileSize,
    })
  } catch (error) {
    return NextResponse.json(
      {
        message: error instanceof Error ? error.message : 'Invalid applicant or PDF details',
        details: error instanceof z.ZodError ? error.flatten() : undefined,
      },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()
  const { data: job, error: jobError } = await supabase
    .from('selection_jobs')
    .select('id, cycle_id, status')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ message: 'Selection job not found' }, { status: 404 })
  }
  if (job.status === 'completed') {
    return NextResponse.json(
      { message: 'This selection job is complete. Create a new job before adding applicants.' },
      { status: 409 },
    )
  }

  const applicationId = randomUUID()
  const documentId = randomUUID()
  const sourceRecordId = `manual:${applicationId}`
  const storagePath = buildSelectionEvidencePath({
    cycleId: job.cycle_id,
    jobId,
    applicationId,
    documentId,
    fileName: input.fileName,
  })

  const { data: application, error: applicationError } = await supabase
    .from('selection_applications')
    .insert({
      id: applicationId,
      cycle_id: job.cycle_id,
      job_id: jobId,
      source_record_id: sourceRecordId,
      source_submitted_at: new Date().toISOString(),
      full_name: input.fullName,
      primary_email: nullable(input.primaryEmail),
      secondary_email: nullable(input.secondaryEmail),
      phone: nullable(input.phone),
      country: nullable(input.country),
      institution: nullable(input.institution),
      course: nullable(input.course),
      graduation_year: input.graduationYear,
      claimed_cgpa: nullable(input.claimedCgpa),
      claimed_academic_status: nullable(input.claimedAcademicStatus),
      leadership_narrative: nullable(input.leadershipNarrative),
      declaration_confirmed: input.declarationConfirmed,
      status: 'imported',
      raw_data: {
        source: 'admin_pdf_upload',
        uploadedBy: adminCheck.user.id,
      },
    })
    .select('id, full_name, country, institution, status')
    .single()

  if (applicationError || !application) {
    return NextResponse.json(
      { message: applicationError?.message || 'Failed to create the applicant' },
      { status: 500 },
    )
  }

  const { data: document, error: documentError } = await supabase
    .from('selection_documents')
    .insert({
      id: documentId,
      application_id: applicationId,
      job_id: jobId,
      document_type: 'academic_evidence',
      source_type: 'direct_upload',
      original_name: input.fileName,
      storage_path: storagePath,
      mime_type: 'application/pdf',
      size_bytes: input.fileSize,
      extraction_status: 'pending',
    })
    .select('id, storage_path, original_name, size_bytes')
    .single()

  if (documentError || !document) {
    await supabase.from('selection_applications').delete().eq('id', applicationId)
    return NextResponse.json(
      { message: documentError?.message || 'Failed to prepare the evidence record' },
      { status: 500 },
    )
  }

  const { data: signedUpload, error: signedUploadError } = await supabase.storage
    .from('selection-evidence')
    .createSignedUploadUrl(storagePath, { upsert: false })

  if (signedUploadError || !signedUpload) {
    await supabase.from('selection_documents').delete().eq('id', documentId)
    await supabase.from('selection_applications').delete().eq('id', applicationId)
    return NextResponse.json(
      { message: signedUploadError?.message || 'Failed to create a private upload URL' },
      { status: 500 },
    )
  }

  await supabase.from('selection_audit_events').insert({
    cycle_id: job.cycle_id,
    job_id: jobId,
    application_id: applicationId,
    actor_id: adminCheck.user.id,
    event_type: 'manual_application_created',
    event_data: {
      documentId,
      originalName: input.fileName,
      expectedBytes: input.fileSize,
    },
  })

  return NextResponse.json(
    {
      application,
      document,
      upload: {
        path: signedUpload.path || storagePath,
        token: signedUpload.token,
        signedUrl: signedUpload.signedUrl,
        bucket: 'selection-evidence',
      },
    },
    { status: 201 },
  )
}
