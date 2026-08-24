import { createHash } from 'node:crypto'

import { createAdminClient } from '@/lib/supabase/server'
import type { SelectionAssessment, SelectionPolicy } from './contracts'
import { SELECTION_PDF_MAX_BYTES } from './contracts'
import {
  extractSelectionPdfWithDocumentAi,
  type SelectionDocumentExtraction,
} from './extraction/document-ai'
import { downloadGoogleDriveFile } from './google/forms'
import { assessMeritWithOpenAI, type MeritAssessment } from './merit/openai'
import { buildSelectionInputFromProcessedEvidence } from './processor'
import { buildApplicantResultView } from './public-result'
import { hasPdfMagicBytes } from './upload'
import { evaluateSelectionApplication } from './verdict'
import { decideSelectionTaskFailure } from './worker-policy'

const DEFAULT_POLICY: SelectionPolicy = {
  minimumMeritScore: 60,
  academicRequirement: 'first_class_or_equivalent',
  requireVerifiedAcademicEvidence: true,
  version: '2026.1',
}

type ProcessingTask = {
  id: string
  job_id: string
  application_id: string
  logical_batch_number: number
  attempt_count: number
  lock_token: string | null
}

type ApplicationRecord = {
  id: string
  job_id: string
  cycle_id: string
  full_name: string
  primary_email: string | null
  country: string | null
  institution: string | null
  claimed_academic_status: string | null
  leadership_narrative: string | null
  declaration_confirmed: boolean
  raw_data: Record<string, unknown> | null
}

type SelectionDocumentRecord = {
  id: string
  application_id: string
  source_type: 'google_drive' | 'direct_upload'
  source_file_id: string | null
  original_name: string
  storage_path: string
  mime_type: string
  size_bytes: number
  sha256: string | null
  extraction_status: string
  extracted_data: Record<string, unknown> | null
}

type SelectionJobRecord = {
  id: string
  cycle_id: string
  selection_cycles:
    | { name?: string; policy?: Partial<SelectionPolicy>; appeal_deadline_at?: string | null }
    | Array<{ name?: string; policy?: Partial<SelectionPolicy>; appeal_deadline_at?: string | null }>
    | null
}

class PermanentSelectionTaskError extends Error {}

const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message.slice(0, 1_500) : 'Unknown selection processing error'

const parsePolicy = (value: Partial<SelectionPolicy> | null | undefined): SelectionPolicy => ({
  minimumMeritScore:
    typeof value?.minimumMeritScore === 'number' &&
    value.minimumMeritScore >= 0 &&
    value.minimumMeritScore <= 100
      ? value.minimumMeritScore
      : DEFAULT_POLICY.minimumMeritScore,
  academicRequirement: 'first_class_or_equivalent',
  requireVerifiedAcademicEvidence:
    typeof value?.requireVerifiedAcademicEvidence === 'boolean'
      ? value.requireVerifiedAcademicEvidence
      : DEFAULT_POLICY.requireVerifiedAcademicEvidence,
  version:
    typeof value?.version === 'string' && value.version.trim()
      ? value.version.trim()
      : DEFAULT_POLICY.version,
})

const cycleFromJob = (job: SelectionJobRecord) =>
  Array.isArray(job.selection_cycles) ? job.selection_cycles[0] ?? null : job.selection_cycles

const isStoredExtraction = (value: unknown): value is SelectionDocumentExtraction => {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    record.provider === 'google_document_ai' &&
    typeof record.text === 'string' &&
    typeof record.pageCount === 'number' &&
    typeof record.confidence === 'number' &&
    Boolean(record.academic && typeof record.academic === 'object')
  )
}

const validatePdfBytes = (bytes: Uint8Array, sourceLabel: string) => {
  if (bytes.length === 0) {
    throw new PermanentSelectionTaskError(`${sourceLabel} is empty`)
  }
  if (bytes.length > SELECTION_PDF_MAX_BYTES) {
    throw new PermanentSelectionTaskError(`${sourceLabel} exceeds the 25MB PDF limit`)
  }
  if (!hasPdfMagicBytes(bytes)) {
    throw new PermanentSelectionTaskError(`${sourceLabel} is not a valid PDF document`)
  }
}

const downloadPrivateSnapshot = async (
  supabase: ReturnType<typeof createAdminClient>,
  storagePath: string,
) => {
  const { data, error } = await supabase.storage.from('selection-evidence').download(storagePath)
  if (error || !data) return null
  return new Uint8Array(await data.arrayBuffer())
}

const snapshotGoogleDriveDocument = async (
  supabase: ReturnType<typeof createAdminClient>,
  document: SelectionDocumentRecord,
) => {
  if (!document.source_file_id) {
    throw new PermanentSelectionTaskError('Google Drive evidence is missing its file id')
  }

  const downloaded = await downloadGoogleDriveFile(document.source_file_id)
  if (downloaded.mimeType !== 'application/pdf') {
    throw new PermanentSelectionTaskError(
      `Google Drive evidence has unsupported MIME type ${downloaded.mimeType}`,
    )
  }
  validatePdfBytes(downloaded.bytes, document.original_name)

  const { error: uploadError } = await supabase.storage
    .from('selection-evidence')
    .upload(document.storage_path, downloaded.bytes, {
      contentType: 'application/pdf',
      cacheControl: '31536000',
      upsert: false,
    })

  if (uploadError) {
    const existing = await downloadPrivateSnapshot(supabase, document.storage_path)
    if (!existing) {
      throw new Error(`Failed to snapshot Google Drive evidence: ${uploadError.message}`)
    }
    validatePdfBytes(existing, document.original_name)
    return existing
  }

  return downloaded.bytes
}

const loadDocumentBytes = async (
  supabase: ReturnType<typeof createAdminClient>,
  document: SelectionDocumentRecord,
) => {
  let bytes = await downloadPrivateSnapshot(supabase, document.storage_path)

  if (!bytes && document.source_type === 'google_drive') {
    bytes = await snapshotGoogleDriveDocument(supabase, document)
  }

  if (!bytes) {
    throw new PermanentSelectionTaskError('Evidence PDF is missing from private storage')
  }

  validatePdfBytes(bytes, document.original_name)
  const sha256 = createHash('sha256').update(bytes).digest('hex')
  const { error } = await supabase
    .from('selection_documents')
    .update({
      size_bytes: bytes.length,
      sha256,
      mime_type: 'application/pdf',
      last_error: null,
    })
    .eq('id', document.id)

  if (error) throw new Error(`Failed to save evidence fingerprint: ${error.message}`)
  return { bytes, sha256 }
}

const getDuplicateSignals = async (
  supabase: ReturnType<typeof createAdminClient>,
  document: SelectionDocumentRecord,
  sha256: string,
) => {
  const { data, error } = await supabase
    .from('selection_documents')
    .select('application_id')
    .eq('sha256', sha256)
    .neq('application_id', document.application_id)
    .limit(5)

  if (error) throw new Error(`Failed to check duplicate evidence: ${error.message}`)

  return (data ?? []).map(
    (match: { application_id: string }) => `EXACT_DOCUMENT_DUPLICATE:${match.application_id}`,
  )
}

const extractDocument = async (
  supabase: ReturnType<typeof createAdminClient>,
  document: SelectionDocumentRecord,
): Promise<{ extraction: SelectionDocumentExtraction; sha256: string }> => {
  const loaded = await loadDocumentBytes(supabase, document)

  if (
    ['completed', 'review_required'].includes(document.extraction_status) &&
    isStoredExtraction(document.extracted_data)
  ) {
    return { extraction: document.extracted_data, sha256: loaded.sha256 }
  }

  const { error: startError } = await supabase
    .from('selection_documents')
    .update({ extraction_status: 'processing', last_error: null })
    .eq('id', document.id)

  if (startError) throw new Error(`Failed to start document extraction: ${startError.message}`)

  const extraction = await extractSelectionPdfWithDocumentAi({
    bytes: loaded.bytes,
    fileName: document.original_name,
  })

  const { error: updateError } = await supabase
    .from('selection_documents')
    .update({
      extraction_status: extraction.confidence < 0.55 ? 'review_required' : 'completed',
      extracted_data: extraction,
      extraction_confidence: Math.round(extraction.confidence * 10_000) / 100,
      last_error: null,
    })
    .eq('id', document.id)

  if (updateError) throw new Error(`Failed to save document extraction: ${updateError.message}`)
  return { extraction, sha256: loaded.sha256 }
}

const loadTaskContext = async (
  supabase: ReturnType<typeof createAdminClient>,
  task: ProcessingTask,
) => {
  const [
    { data: application, error: applicationError },
    { data: job, error: jobError },
    { data: documents, error: documentsError },
  ] = await Promise.all([
    supabase
      .from('selection_applications')
      .select(
        'id, job_id, cycle_id, full_name, primary_email, country, institution, claimed_academic_status, leadership_narrative, declaration_confirmed, raw_data',
      )
      .eq('id', task.application_id)
      .eq('job_id', task.job_id)
      .single(),
    supabase
      .from('selection_jobs')
      .select('id, cycle_id, selection_cycles(name, policy, appeal_deadline_at)')
      .eq('id', task.job_id)
      .single(),
    supabase
      .from('selection_documents')
      .select(
        'id, application_id, source_type, source_file_id, original_name, storage_path, mime_type, size_bytes, sha256, extraction_status, extracted_data',
      )
      .eq('application_id', task.application_id)
      .order('created_at', { ascending: true }),
  ])

  if (applicationError || !application) {
    throw new PermanentSelectionTaskError(
      `Application could not be loaded: ${applicationError?.message ?? 'missing application'}`,
    )
  }
  if (jobError || !job) {
    throw new PermanentSelectionTaskError(
      `Selection job could not be loaded: ${jobError?.message ?? 'missing job'}`,
    )
  }
  if (documentsError) {
    throw new Error(`Selection documents could not be loaded: ${documentsError.message}`)
  }

  return {
    application: application as ApplicationRecord,
    job: job as SelectionJobRecord,
    documents: (documents ?? []) as SelectionDocumentRecord[],
  }
}

const saveAssessment = async ({
  supabase,
  application,
  job,
  assessment,
  policy,
  meritAssessment,
}: {
  supabase: ReturnType<typeof createAdminClient>
  application: ApplicationRecord
  job: SelectionJobRecord
  assessment: SelectionAssessment
  policy: SelectionPolicy
  meritAssessment: MeritAssessment | null
}) => {
  const internalReasons = Array.from(
    new Set([...assessment.internalReasons, ...(meritAssessment?.internalReasons ?? [])]),
  )
  const publicReasons = Array.from(
    new Set([
      ...assessment.publicReasons,
      ...(assessment.verdict === 'not_qualified' ? meritAssessment?.publicGaps ?? [] : []),
    ]),
  )

  const { data: savedAssessment, error: assessmentError } = await supabase
    .from('selection_assessments')
    .upsert(
      {
        application_id: application.id,
        job_id: job.id,
        policy_version: policy.version,
        verdict: assessment.verdict,
        total_score: assessment.totalScore,
        score_breakdown: assessment.scoreBreakdown,
        reason_codes: assessment.reasonCodes,
        internal_reasons: internalReasons,
        public_reasons: publicReasons,
        requires_human_review: assessment.requiresHumanReview,
      },
      { onConflict: 'application_id,policy_version' },
    )
    .select('id')
    .single()

  if (assessmentError || !savedAssessment) {
    throw new Error(
      `Failed to save selection assessment: ${assessmentError?.message ?? 'missing record'}`,
    )
  }

  const cycle = cycleFromJob(job)
  const resultPayload = buildApplicantResultView({
    assessment: { ...assessment, internalReasons, publicReasons },
    policy,
    cycleName: cycle?.name || 'Top100 Africa Future Leaders',
    publishedAt: new Date().toISOString(),
    appealDeadline: cycle?.appeal_deadline_at ?? undefined,
  })

  const [{ error: resultError }, { error: applicationUpdateError }] = await Promise.all([
    supabase.from('selection_public_results').upsert(
      {
        application_id: application.id,
        assessment_id: savedAssessment.id,
        payload: resultPayload,
        is_published: false,
      },
      { onConflict: 'application_id' },
    ),
    supabase
      .from('selection_applications')
      .update({ status: assessment.requiresHumanReview ? 'review_required' : 'assessed' })
      .eq('id', application.id),
  ])

  if (resultError) throw new Error(`Failed to prepare applicant result: ${resultError.message}`)
  if (applicationUpdateError) {
    throw new Error(`Failed to update application status: ${applicationUpdateError.message}`)
  }
}

const finishTask = async (
  supabase: ReturnType<typeof createAdminClient>,
  task: ProcessingTask,
) => {
  const { error } = await supabase
    .from('selection_processing_tasks')
    .update({
      status: 'completed',
      locked_at: null,
      lock_token: null,
      last_error: null,
    })
    .eq('id', task.id)
    .eq('lock_token', task.lock_token)

  if (error) throw new Error(`Failed to complete processing task: ${error.message}`)
}

const recordAudit = async ({
  supabase,
  task,
  eventType,
  eventData,
}: {
  supabase: ReturnType<typeof createAdminClient>
  task: ProcessingTask
  eventType: string
  eventData: Record<string, unknown>
}) => {
  await supabase.from('selection_audit_events').insert({
    job_id: task.job_id,
    application_id: task.application_id,
    event_type: eventType,
    event_data: eventData,
  })
}

const processTask = async (
  supabase: ReturnType<typeof createAdminClient>,
  task: ProcessingTask,
) => {
  const { application, job, documents } = await loadTaskContext(supabase, task)
  const cycle = cycleFromJob(job)
  const policy = parsePolicy(cycle?.policy)

  await supabase
    .from('selection_applications')
    .update({ status: 'processing' })
    .eq('id', application.id)

  const extractions: SelectionDocumentExtraction[] = []
  const duplicateSignals: string[] = []

  for (const document of documents) {
    const processed = await extractDocument(supabase, document)
    extractions.push(processed.extraction)
    duplicateSignals.push(
      ...(await getDuplicateSignals(supabase, document, processed.sha256)),
    )
  }

  const extraction =
    extractions.slice().sort((left, right) => right.confidence - left.confidence)[0] ?? null
  const supportingEvidenceText = extractions
    .map((item) => item.text)
    .join('\n\n')
    .slice(0, 24_000)

  let meritAssessment: MeritAssessment | null = null
  if (process.env.OPENAI_API_KEY?.trim() && application.leadership_narrative?.trim()) {
    meritAssessment = await assessMeritWithOpenAI({
      leadershipNarrative: application.leadership_narrative,
      supportingEvidenceText,
    })
  }

  const assessmentInput = buildSelectionInputFromProcessedEvidence({
    application,
    extraction,
    meritAssessment,
    duplicateSignals,
  })
  const assessment = evaluateSelectionApplication(assessmentInput, policy)

  await saveAssessment({
    supabase,
    application,
    job,
    assessment,
    policy,
    meritAssessment,
  })
  await finishTask(supabase, task)
  await recordAudit({
    supabase,
    task,
    eventType: 'application_processed',
    eventData: {
      verdict: assessment.verdict,
      totalScore: assessment.totalScore,
      policyVersion: policy.version,
      logicalBatchNumber: task.logical_batch_number,
      documentCount: documents.length,
    },
  })
  await supabase.rpc('refresh_selection_job_counts', { p_job_id: task.job_id })

  return assessment.verdict
}

const saveFailureAssessment = async (
  supabase: ReturnType<typeof createAdminClient>,
  task: ProcessingTask,
  message: string,
) => {
  const { application, job } = await loadTaskContext(supabase, task)
  const policy = parsePolicy(cycleFromJob(job)?.policy)
  const assessment: SelectionAssessment = {
    applicationId: application.id,
    fullName: application.full_name,
    country: application.country,
    verdict: 'needs_review',
    totalScore: 0,
    scoreBreakdown: {
      academic: 0,
      leadership: 0,
      impact: 0,
      initiative: 0,
      communication: 0,
    },
    reasonCodes: ['AUTOMATED_PROCESSING_FAILED'],
    internalReasons: [message],
    publicReasons: [
      'The application requires additional review because one or more submitted documents could not be processed automatically.',
    ],
    requiresHumanReview: true,
    policyVersion: policy.version,
  }

  await saveAssessment({
    supabase,
    application,
    job,
    assessment,
    policy,
    meritAssessment: null,
  })
}

const failTask = async (
  supabase: ReturnType<typeof createAdminClient>,
  task: ProcessingTask,
  error: unknown,
) => {
  const message = errorMessage(error)
  const decision = decideSelectionTaskFailure({
    attemptCount: task.attempt_count,
    permanent: error instanceof PermanentSelectionTaskError,
  })

  if (decision.requiresHumanReview) {
    try {
      await saveFailureAssessment(supabase, task, message)
    } catch (assessmentError) {
      console.error('[selection-worker] Failed to save fallback review assessment', assessmentError)
    }
  }

  const availableAt = new Date(Date.now() + decision.delaySeconds * 1000).toISOString()
  const { error: updateError } = await supabase
    .from('selection_processing_tasks')
    .update({
      status: decision.status,
      available_at: availableAt,
      locked_at: null,
      lock_token: null,
      last_error: message,
    })
    .eq('id', task.id)
    .eq('lock_token', task.lock_token)

  if (updateError) throw new Error(`Failed to record task failure: ${updateError.message}`)

  await recordAudit({
    supabase,
    task,
    eventType:
      decision.status === 'retry'
        ? 'application_processing_retry'
        : 'application_processing_failed',
    eventData: {
      attemptCount: task.attempt_count,
      error: message,
      nextAttemptAt: decision.status === 'retry' ? availableAt : null,
    },
  })
  await supabase.rpc('refresh_selection_job_counts', { p_job_id: task.job_id })

  return decision.status
}

export async function runSelectionWorker({ limit = 3 }: { limit?: number } = {}) {
  const supabase = createAdminClient()
  const { data, error } = await supabase.rpc('claim_selection_processing_tasks', {
    p_limit: Math.min(10, Math.max(1, Math.floor(limit))),
    p_lock_minutes: 10,
  })

  if (error) throw new Error(`Failed to claim selection processing tasks: ${error.message}`)
  const tasks = (data ?? []) as ProcessingTask[]

  const results = await Promise.all(
    tasks.map(async (task) => {
      try {
        const verdict = await processTask(supabase, task)
        return { taskId: task.id, status: 'completed' as const, verdict }
      } catch (taskError) {
        const status = await failTask(supabase, task, taskError)
        return { taskId: task.id, status, error: errorMessage(taskError) }
      }
    }),
  )

  return {
    claimed: tasks.length,
    completed: results.filter((result) => result.status === 'completed').length,
    retried: results.filter((result) => result.status === 'retry').length,
    failed: results.filter((result) => result.status === 'failed').length,
    results,
  }
}
