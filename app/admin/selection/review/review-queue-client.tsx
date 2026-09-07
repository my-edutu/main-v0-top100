'use client'

import { useRouter } from 'next/navigation'
import { FileText, ShieldAlert, ArrowUpRight } from 'lucide-react'
import HumanReviewForm, { type ReviewAssessment } from '../human-review-form'

export type ReviewApplicant = {
  id: string; full_name: string; country: string | null; institution: string | null
  course: string | null; claimed_cgpa: string | null; claimed_academic_status: string | null
  leadership_narrative: string | null
  selection_cycles: { policy?: { version?: string } } | Array<{ policy?: { version?: string } }> | null
  selection_jobs: { source_label?: string } | Array<{ source_label?: string }> | null
  selection_assessments: Array<ReviewAssessment & { internal_reasons?: string[] }> | null
  selection_documents: Array<{
    id: string; original_name: string; size_bytes: number; sha256: string | null
    extraction_status: string; extraction_confidence: number | null; integrity_flags: string[]
  }> | null
}
const explainSignal = (reason: string) => {
  if (reason.startsWith('EXACT_DOCUMENT_DUPLICATE')) return 'The same document fingerprint appears in another application. Investigate; this alone is not proof of fraud.'
  if (reason === 'ACADEMIC_AUTHENTICITY_NOT_VERIFIED') return 'The issuing source and academic authenticity have not been verified.'
  if (reason === 'DOCUMENT_HOLDER_NOT_VERIFIED') return 'The connection between this applicant and the document holder has not been verified.'
  if (reason === 'INSTITUTION_NAME_MISMATCH') return 'Institution wording differs. Check aliases, language, naming changes and the original evidence.'
  if (reason === 'ACADEMIC_FIELDS_REQUIRE_RECONCILIATION') return 'Academic fields conflict or a grading legend may have been mistaken for an awarded classification.'
  if (reason.startsWith('MERIT_')) return 'Leadership and impact claims need a documented human assessment.'
  return 'An additional private review signal is recorded. Examine the original evidence and audit history.'
}

export default function ReviewQueueClient({ applicants, focusApplicationId }: {
  applicants: ReviewApplicant[]; focusApplicationId?: string
}) {
  const router = useRouter()
  if (!applicants.length) return <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-center"><ShieldAlert aria-hidden="true" className="mx-auto size-8 text-zinc-600" /><h2 className="mt-3 text-lg font-semibold">No cases match this view</h2><p className="mt-2 text-sm text-zinc-600">This does not certify the cycle as complete. Check the filters and processing status.</p></div>
  return <div className="space-y-5">{applicants.map((applicant) => {
    const cycle = Array.isArray(applicant.selection_cycles) ? applicant.selection_cycles[0] : applicant.selection_cycles
    const assessment = applicant.selection_assessments?.find((item) => item.policy_version === cycle?.policy?.version) ?? null
    const focused = focusApplicationId === applicant.id
    const signals = [...new Set((assessment?.internal_reasons ?? []).filter((reason) => !reason.startsWith('Reviewer note:')).map(explainSignal))]
    return <article key={applicant.id} className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 p-5">
        <div><p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Private applicant case</p><h2 className="mt-1 text-xl font-bold text-zinc-950">{applicant.full_name}</h2><p className="mt-1 text-sm text-zinc-600">{[applicant.country,applicant.institution,applicant.course].filter(Boolean).join(' · ') || 'Application details incomplete'}</p></div>
        {!focused && <a className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-zinc-950 px-4 py-2 text-sm font-semibold text-white" href={`/admin/selection/review?application=${encodeURIComponent(applicant.id)}`}>Open case <ArrowUpRight aria-hidden="true" className="size-4" /></a>}
      </header>
      {!focused ? <div className="p-5 text-sm text-zinc-600">{applicant.selection_documents?.length ?? 0} evidence file(s) · {signals.length ? 'Verification checks outstanding' : 'Review the original evidence before deciding'}</div> : <>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <section><h3 className="font-semibold text-zinc-950">Applicant claims — not established facts</h3><dl className="mt-3 space-y-3 text-sm"><div className="rounded-xl bg-zinc-50 p-3"><dt className="font-semibold">Academic claim</dt><dd className="mt-1">{applicant.claimed_academic_status || 'Not provided'}{applicant.claimed_cgpa ? ` · CGPA ${applicant.claimed_cgpa}` : ''}</dd></div><div className="rounded-xl bg-zinc-50 p-3"><dt className="font-semibold">Leadership and impact narrative</dt><dd className="mt-1 whitespace-pre-wrap break-words leading-6">{applicant.leadership_narrative || 'Not provided'}</dd></div></dl>
            {signals.length > 0 && <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4"><h4 className="text-sm font-semibold">What needs checking</h4><ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6">{signals.map((signal) => <li key={signal}>{signal}</li>)}</ul></div>}
          </section>
          <section><h3 className="font-semibold text-zinc-950">Original evidence</h3><p className="mt-1 text-sm leading-6 text-zinc-600">OCR confidence measures text extraction, not authenticity. Opening a file is recorded privately and its stored fingerprint is checked.</p>
            <div className="mt-3 space-y-3">{(applicant.selection_documents ?? []).map((document) => <div key={document.id} className="rounded-xl border border-zinc-200 p-4"><div className="flex items-start gap-3"><FileText aria-hidden="true" className="size-5 shrink-0 text-orange-600" /><div className="min-w-0"><p className="break-words text-sm font-semibold">{document.original_name}</p><p className="mt-1 text-xs leading-5 text-zinc-600">{document.size_bytes > 0 ? `${Math.round(document.size_bytes / 1024)} KB` : 'Snapshot pending'} · {document.extraction_status}{typeof document.extraction_confidence === 'number' && Number.isFinite(document.extraction_confidence) ? ` · ${document.extraction_confidence.toFixed(1)}% text confidence` : ''}</p></div></div>
              {document.sha256 && document.size_bytes > 0 ? <a href={`/api/admin/selection/applications/${applicant.id}/documents/${document.id}/access`} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium">Open original PDF <ArrowUpRight aria-hidden="true" className="size-4" /><span className="sr-only">in a new tab</span></a> : <p className="mt-3 text-sm text-amber-800">The private snapshot is not confirmed yet. Do not treat this as verified evidence.</p>}
            </div>)}{!applicant.selection_documents?.length && <p className="rounded-xl border border-dashed border-amber-300 p-4 text-sm text-amber-900">No supported PDF is attached. Request suitable evidence through the programme’s approved correction channel; keep this case unresolved.</p>}</div>
          </section>
        </div>
        <div className="border-t border-zinc-100 p-5"><HumanReviewForm applicationId={applicant.id} applicantName={applicant.full_name} assessment={assessment} onSaved={() => router.refresh()} /></div>
      </>}
    </article>
  })}</div>
}
