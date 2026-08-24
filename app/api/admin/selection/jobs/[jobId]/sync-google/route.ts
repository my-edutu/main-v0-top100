import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'

import { requireAdmin } from '@/lib/api/require-admin'
import { createAdminClient } from '@/lib/supabase/server'
import {
  fetchGoogleFormDefinition,
  listGoogleFormResponses,
  normalizeGoogleFormResponse,
} from '@/lib/selection/google/forms'
import { buildSelectionEvidencePath } from '@/lib/selection/upload'

export const runtime = 'nodejs'
export const maxDuration = 300

type RouteContext = {
  params: Promise<{ jobId: string }>
}

type SourceConfig = {
  formId?: string
  spreadsheetId?: string
  nextPageToken?: string | null
  importComplete?: boolean
  importedResponses?: number
  formRevisionId?: string | null
  linkedSheetVerified?: boolean
  lastSyncedAt?: string
}

const nullable = (value: string | null) => value || null

export async function POST(request: NextRequest, { params }: RouteContext) {
  const adminCheck = await requireAdmin(request)
  if ('error' in adminCheck) return adminCheck.error

  const { jobId } = await params
  const supabase = createAdminClient()
  const { data: job, error: jobError } = await supabase
    .from('selection_jobs')
    .select('id, cycle_id, source_type, source_config, status')
    .eq('id', jobId)
    .single()

  if (jobError || !job) {
    return NextResponse.json({ message: 'Selection job not found' }, { status: 404 })
  }
  if (job.source_type !== 'google_form') {
    return NextResponse.json(
      { message: 'This action is available only for Google Form selection jobs.' },
      { status: 409 },
    )
  }
  if (job.status === 'processing') {
    return NextResponse.json(
      { message: 'Pause or complete the current processing batch before importing more responses.' },
      { status: 409 },
    )
  }

  const config = (job.source_config ?? {}) as SourceConfig
  if (!config.formId || !config.spreadsheetId) {
    return NextResponse.json(
      { message: 'The job is missing its Google Form or linked spreadsheet identifier.' },
      { status: 400 },
    )
  }
  if (config.importComplete) {
    return NextResponse.json({
      jobId,
      importedThisPage: 0,
      totalImported: config.importedResponses ?? 0,
      importComplete: true,
      message: 'Every Google Form response has already been imported.',
    })
  }

  try {
    const form = await fetchGoogleFormDefinition(config.formId)
    if (!form.linkedSheetId) {
      return NextResponse.json(
        { message: 'The connected Google Form does not report a linked response spreadsheet.' },
        { status: 409 },
      )
    }
    if (form.linkedSheetId !== config.spreadsheetId) {
      return NextResponse.json(
        {
          message: 'The selected spreadsheet is not the response destination linked to this Google Form.',
          expectedSpreadsheetId: form.linkedSheetId,
          configuredSpreadsheetId: config.spreadsheetId,
        },
        { status: 409 },
      )
    }

    const page = await listGoogleFormResponses({
      formId: config.formId,
      pageToken: config.nextPageToken,
      pageSize: 100,
    })
    const responses = page.responses ?? []

    const normalizationErrors: Array<{ responseId: string | null; message: string }> = []
    const normalized = responses.flatMap((response) => {
      try {
        return [normalizeGoogleFormResponse({ form, response })]
      } catch (error) {
        normalizationErrors.push({
          responseId: response.responseId ?? null,
          message: error instanceof Error ? error.message : 'Response could not be normalized',
        })
        return []
      }
    })

    if (normalizationErrors.length > 0) {
      await supabase.from('selection_audit_events').insert({
        cycle_id: job.cycle_id,
        job_id: jobId,
        actor_id: adminCheck.user.id,
        event_type: 'google_form_import_blocked',
        event_data: {
          pageToken: config.nextPageToken ?? null,
          errors: normalizationErrors.slice(0, 25),
          totalErrors: normalizationErrors.length,
        },
      })

      return NextResponse.json(
        {
          message: 'This page was not imported because one or more responses were incomplete or could not be mapped safely.',
          errors: normalizationErrors,
        },
        { status: 422 },
      )
    }

    const sourceRecordIds = normalized.map((entry) => entry.application.sourceRecordId)
    const { data: existingApplications, error: existingError } = sourceRecordIds.length
      ? await supabase
          .from('selection_applications')
          .select('id, source_record_id')
          .eq('cycle_id', job.cycle_id)
          .in('source_record_id', sourceRecordIds)
      : { data: [], error: null }

    if (existingError) throw new Error(`Failed to reconcile existing responses: ${existingError.message}`)
    const existingMap = new Map(
      (existingApplications ?? []).map((application: any) => [application.source_record_id, application.id]),
    )

    const applicationPayload = normalized.map((entry) => {
      const application = entry.application
      return {
        id: existingMap.get(application.sourceRecordId) ?? randomUUID(),
        cycle_id: job.cycle_id,
        job_id: jobId,
        source_record_id: application.sourceRecordId,
        source_submitted_at: application.sourceSubmittedAt,
        full_name: application.fullName,
        primary_email: application.primaryEmail,
        secondary_email: application.secondaryEmail,
        phone: application.phone,
        country: application.country,
        institution: application.institution,
        course: application.course,
        graduation_year: application.graduationYear,
        claimed_cgpa: application.claimedCgpa,
        claimed_academic_status: application.claimedAcademicStatus,
        leadership_narrative: application.leadershipNarrative,
        declaration_confirmed: application.declarationConfirmed,
        status: 'imported',
        raw_data: application.rawData,
      }
    })

    let savedApplications: Array<{ id: string; source_record_id: string }> = []
    if (applicationPayload.length > 0) {
      const { data, error } = await supabase
        .from('selection_applications')
        .upsert(applicationPayload, { onConflict: 'cycle_id,source_record_id' })
        .select('id, source_record_id')

      if (error) throw new Error(`Failed to store Google Form applications: ${error.message}`)
      savedApplications = data ?? []
    }

    const savedMap = new Map(savedApplications.map((application) => [application.source_record_id, application.id]))
    const applicationIds = savedApplications.map((application) => application.id)
    const { data: existingDocuments, error: documentsLookupError } = applicationIds.length
      ? await supabase
          .from('selection_documents')
          .select('application_id, source_file_id')
          .in('application_id', applicationIds)
          .not('source_file_id', 'is', null)
      : { data: [], error: null }

    if (documentsLookupError) {
      throw new Error(`Failed to reconcile Google Drive evidence: ${documentsLookupError.message}`)
    }
    const existingDocumentKeys = new Set(
      (existingDocuments ?? []).map(
        (document: any) => `${document.application_id}:${document.source_file_id}`,
      ),
    )

    const documentPayload = normalized.flatMap((entry) => {
      const applicationId = savedMap.get(entry.application.sourceRecordId)
      if (!applicationId) return []

      return entry.academicPdfFiles.flatMap((file) => {
        const key = `${applicationId}:${file.fileId}`
        if (existingDocumentKeys.has(key)) return []

        const documentId = randomUUID()
        return [
          {
            id: documentId,
            application_id: applicationId,
            job_id: jobId,
            document_type: 'academic_evidence',
            source_type: 'google_drive',
            source_file_id: file.fileId,
            original_name: file.fileName,
            storage_path: buildSelectionEvidencePath({
              cycleId: job.cycle_id,
              jobId,
              applicationId,
              documentId,
              fileName: file.fileName,
            }),
            mime_type: 'application/pdf',
            size_bytes: 0,
            extraction_status: 'pending',
          },
        ]
      })
    })

    if (documentPayload.length > 0) {
      const { error } = await supabase.from('selection_documents').insert(documentPayload)
      if (error) throw new Error(`Failed to store Google Drive evidence records: ${error.message}`)
    }

    const { count, error: countError } = await supabase
      .from('selection_applications')
      .select('id', { count: 'exact', head: true })
      .eq('job_id', jobId)
    if (countError) throw new Error(`Failed to reconcile imported applications: ${countError.message}`)

    const nextPageToken = page.nextPageToken ?? null
    const nextConfig: SourceConfig = {
      ...config,
      nextPageToken,
      importComplete: !nextPageToken,
      importedResponses: count ?? 0,
      formRevisionId: form.revisionId ?? null,
      linkedSheetVerified: true,
      lastSyncedAt: new Date().toISOString(),
    }
    const { error: updateError } = await supabase
      .from('selection_jobs')
      .update({
        source_config: nextConfig,
        total_count: count ?? 0,
        status: 'ready',
        last_error: null,
      })
      .eq('id', jobId)

    if (updateError) throw new Error(`Failed to save import progress: ${updateError.message}`)

    await supabase.from('selection_audit_events').insert({
      cycle_id: job.cycle_id,
      job_id: jobId,
      actor_id: adminCheck.user.id,
      event_type: 'google_form_page_imported',
      event_data: {
        importedResponses: normalized.length,
        totalImported: count ?? 0,
        pdfEvidenceRecordsAdded: documentPayload.length,
        unsupportedEvidenceFiles: normalized.reduce(
          (total, entry) => total + entry.unsupportedAcademicFiles.length,
          0,
        ),
        importComplete: !nextPageToken,
        formRevisionId: form.revisionId ?? null,
      },
    })

    return NextResponse.json({
      jobId,
      importedThisPage: normalized.length,
      totalImported: count ?? 0,
      pdfEvidenceRecordsAdded: documentPayload.length,
      unsupportedEvidenceFiles: normalized.reduce(
        (total, entry) => total + entry.unsupportedAcademicFiles.length,
        0,
      ),
      importComplete: !nextPageToken,
      hasMore: Boolean(nextPageToken),
      formTitle: form.info?.title ?? null,
      linkedSheetVerified: true,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Google Form import failed'
    await supabase
      .from('selection_jobs')
      .update({ last_error: message, status: 'failed' })
      .eq('id', jobId)

    return NextResponse.json({ message }, { status: 500 })
  }
}
