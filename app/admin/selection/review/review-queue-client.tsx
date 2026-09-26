'use client'

import { useRouter } from 'next/navigation'
import { AlertCircle, FileText, ShieldAlert } from 'lucide-react'

import HumanReviewForm, { type ReviewAssessment } from '../human-review-form'

type ReviewApplicant = {
  id: string
  full_name: string
  primary_email: string | null
  country: string | null
  institution: string | null
  course: string | null
  claimed_cgpa: string | null
  claimed_academic_status: string | null
  leadership_narrative: string | null
  selection_jobs: { source_label?: string } | Array<{ source_label?: string }> | null
  selection_assessments: Array<
    ReviewAssessment & {
      reason_codes?: string[]
      internal_reasons?: string[]
    }
  > | null
  selection_documents: Array<{
    id: string
    original_name: string
    size_bytes: number
    sha256: string | null
    extraction_status: string
    extraction_confidence: number | null
    integrity_flags: string[]
    extracted_data: Record<string, unknown> | null
    last_error: string | null
  }> | null
}

export default function ReviewQueueClient({ applicants }: { applicants: ReviewApplicant[] }) {
  const router = useRouter()

  if (applicants.length === 0) {
    return (
      <div className="flex min-h-72 flex-col items-center justify-center rounded-[28px] border border-dashed border-emerald-200 bg-emerald-50/40 p-8 text-center">
        <ShieldAlert className="size-10 text-emerald-600" />
        <h2 className="mt-4 text-xl font-semibold text-zinc-950">Review queue is clear</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-zinc-600">
          Unreadable PDFs, conflicting data, unsupported evidence, integrity signals, and uncertain merit assessments will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {applicants.map((applicant) => {
        const assessment = applicant.selection_assessments?.[0] ?? null
        const job = Array.isArray(applicant.selection_jobs)
          ? applicant.selection_jobs[0] ?? null
          : applicant.selection_jobs

        return (
          <article key={applicant.id} className="overflow-hidden rounded-[28px] border border-amber-200 bg-white">
            <header className="border-b border-amber-100 bg-amber-50/70 p-5 sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">
                    <AlertCircle className="size-4" /> Human review required
                  </div>
                  <h2 className="mt-2 text-xl font-bold text-zinc-950">{applicant.full_name}</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    {[applicant.country, applicant.institution, applicant.course].filter(Boolean).join(' · ') || 'Applicant details incomplete'}
                  </p>
                </div>
                <div className="rounded-xl border border-amber-200 bg-white px-3 py-2 text-xs text-zinc-600">
                  {job?.source_label || 'Selection job'}
                </div>
              </div>
            </header>

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-2">
              <section>
                <h3 className="text-sm font-semibold text-zinc-950">Application claims</h3>
                <dl className="mt-3 space-y-2 text-sm">
                  <div className="rounded-xl bg-zinc-50 p-3"><dt className="text-xs uppercase tracking-wide text-zinc-500">Academic claim</dt><dd className="mt-1 text-zinc-800">{applicant.claimed_academic_status || 'Not provided'}{applicant.claimed_cgpa ? ` · CGPA ${applicant.claimed_cgpa}` : ''}</dd></div>
                  <div className="rounded-xl bg-zinc-50 p-3"><dt className="text-xs uppercase tracking-wide text-zinc-500">Leadership and impact</dt><dd className="mt-1 whitespace-pre-wrap leading-6 text-zinc-800">{applicant.leadership_narrative || 'Not provided'}</dd></div>
                </dl>

                {(assessment?.internal_reasons?.length ?? 0) > 0 && (
                  <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-rose-700">Private engine reasons</div>
                    <ul className="mt-2 space-y-1 text-sm leading-6 text-rose-900">
                      {assessment?.internal_reasons?.map((reason) => <li key={reason}>• {reason}</li>)}
                    </ul>
                  </div>
                )}
              </section>

              <section>
                <h3 className="text-sm font-semibold text-zinc-950">Evidence files</h3>
                <div className="mt-3 space-y-3">
                  {(applicant.selection_documents ?? []).map((document) => (
                    <div key={document.id} className="rounded-xl border border-zinc-200 p-3">
                      <div className="flex items-start gap-3">
                        <FileText className="mt-0.5 size-5 shrink-0 text-orange-500" />
                        <div className="min-w-0 text-sm">
                          <div className="truncate font-semibold text-zinc-950">{document.original_name}</div>
                          <div className="mt-1 text-xs leading-5 text-zinc-500">
                            {document.extraction_status} · {document.size_bytes > 0 ? `${Math.round(document.size_bytes / 1024)} KB` : 'snapshot pending'}
                            {document.extraction_confidence != null ? ` · ${document.extraction_confidence}% OCR confidence` : ''}
                          </div>
                          {document.sha256 && <div className="mt-1 break-all font-mono text-[10px] text-zinc-400">SHA-256 {document.sha256}</div>}
                          {document.integrity_flags?.length > 0 && <div className="mt-2 text-xs font-medium text-amber-700">Internal flags: {document.integrity_flags.join(', ')}</div>}
                          {document.last_error && <div className="mt-2 text-xs text-rose-700">{document.last_error}</div>}
                        </div>
                      </div>
                    </div>
                  ))}
                  {(applicant.selection_documents ?? []).length === 0 && (
                    <div className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">No supported PDF evidence was attached.</div>
                  )}
                </div>
              </section>
            </div>

            <div className="border-t border-zinc-100 p-5 sm:p-6">
              <HumanReviewForm
                applicationId={applicant.id}
                applicantName={applicant.full_name}
                assessment={assessment}
                onSaved={() => router.refresh()}
              />
            </div>
          </article>
        )
      })}
    </div>
  )
}
