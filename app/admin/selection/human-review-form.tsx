'use client'

import { type FormEvent, useEffect, useMemo, useState } from 'react'
import { Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { assertReviewVerification, type SelectionReviewVerification } from '@/lib/selection/assurance'

export type ReviewAssessment = {
  verdict: 'qualified' | 'not_qualified' | 'needs_review'
  total_score: number
  score_breakdown: Record<string, number>
  public_reasons: string[]
  revision?: number
  policy_version?: string
}
const criteria = [
  ['academic', 'Academic excellence', 30], ['leadership', 'Leadership responsibility', 25],
  ['impact', 'Measurable impact', 25], ['initiative', 'Initiative and service', 10],
  ['communication', 'Communication and clarity', 10],
] as const
const initialVerification: SelectionReviewVerification = {
  academicOutcome: 'unconfirmed', identityConfirmed: false, academicEvidenceAuthenticated: false,
  leadershipEvidenceReviewed: false, noConflictOfInterest: false, evidenceReference: '', equivalenceReference: '',
}

export default function HumanReviewForm({ applicationId, applicantName, assessment, onSaved }: {
  applicationId: string; applicantName: string; assessment: ReviewAssessment | null
  onSaved: () => Promise<void> | void
}) {
  const [saving, setSaving] = useState(false)
  const [revision, setRevision] = useState<number | null>(assessment?.revision ?? null)
  const [verdict, setVerdict] = useState<ReviewAssessment['verdict']>('needs_review')
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(criteria.map(([key]) => [key,
    typeof assessment?.score_breakdown?.[key] === 'number' ? String(assessment.score_breakdown[key]) : '',
  ])))
  const [verification, setVerification] = useState<SelectionReviewVerification>({ ...initialVerification })
  const [publicReasons, setPublicReasons] = useState('')
  const [reviewerNotes, setReviewerNotes] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const [dirty, setDirty] = useState(false)
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const stale = (assessment?.revision ?? null) !== revision
  const total = useMemo(() => criteria.reduce((sum, [key]) => sum + (Number(scores[key]) || 0), 0), [scores])
  const final = verdict !== 'needs_review'
  const setCheck = (key: 'identityConfirmed' | 'academicEvidenceAuthenticated' | 'leadershipEvidenceReviewed' | 'noConflictOfInterest', checked: boolean) => {
    setVerification((value) => ({ ...value, [key]: checked })); setConfirmed(false)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (saving || stale) return
    setError(''); setStatus('')
    try {
      assertReviewVerification(verdict, verification)
      if (final && !confirmed) throw new Error('Review and confirm this decision before saving.')
      for (const [key, label, maximum] of criteria) {
        if ((final && !scores[key].trim()) || !Number.isFinite(Number(scores[key])) || Number(scores[key]) < 0 || Number(scores[key]) > maximum) {
          throw new Error(`${label} must have a score between 0 and ${maximum}.`)
        }
      }
      const reasons = publicReasons.split(/\n+/).map((reason) => reason.trim()).filter(Boolean)
      if (!reasons.length || reasons.length > 8 || reasons.some((reason) => reason.length < 10 || reason.length > 600)) {
        throw new Error('Provide 1–8 clear applicant-facing reasons, each 10–600 characters.')
      }
      if (reviewerNotes.trim().length < 10) throw new Error('Explain the evidence you checked in the private reviewer note.')
      setSaving(true)
      const response = await fetch(`/api/admin/selection/applications/${applicationId}/review`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ expectedRevision: revision, verdict, verification,
          scoreBreakdown: Object.fromEntries(criteria.map(([key]) => [key, Number(scores[key])])),
          publicReasons: reasons, reviewerNotes }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.message || 'The review was not saved. Your input is still here.')
      setDirty(false)
      setRevision(payload.revision)
      setStatus(`Review saved for ${applicantName}. The result is private and awaits independent publication approval.`)
      setConfirmed(false)
      Promise.resolve().then(onSaved).catch(() => setStatus('Review saved. Reload the page to refresh the queue.'))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The review was not saved. Your input is still here.')
    } finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} onChange={() => setDirty(true)} className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-6" aria-label={`Review ${applicantName}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-950"><ShieldCheck aria-hidden="true" className="size-5 text-orange-600" />Evidence-led human review</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">Extracted text and AI scores are suggestions, not proof. Verify the holder and issuing source. A different administrator must publish a final result.</p></div>
        <output className="rounded-xl bg-zinc-100 px-4 py-3 text-lg font-bold tabular-nums" aria-label="Provisional rubric total">{total.toFixed(2)} / 100<span className="block text-xs font-normal text-zinc-600">Provisional until reviewed</span></output>
      </div>
      {stale && <p role="alert" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm">This assessment changed. Your unsaved input is preserved, but cannot overwrite the newer revision. Reload and compare the latest evidence.</p>}
      {error && <p role="alert" className="mt-4 rounded-xl border border-red-300 bg-red-50 p-3 text-sm text-red-900">{error}</p>}
      <p role="status" aria-live="polite" className="mt-3 text-sm text-emerald-800">{status}</p>
      <fieldset disabled={saving || stale} className="mt-5 space-y-6 disabled:opacity-70">
        <legend className="sr-only">Verification and decision fields</legend>
        <section className="space-y-3" aria-labelledby={`${applicationId}-verification-title`}>
          <h4 id={`${applicationId}-verification-title`} className="font-semibold">1. Verify evidence before scoring</h4>
          <Label htmlFor={`${applicationId}-academic-outcome`}>Confirmed academic classification</Label>
          <select id={`${applicationId}-academic-outcome`} value={verification.academicOutcome} className="min-h-11 w-full rounded-md border border-input bg-white px-3 text-sm" onChange={(event) => {setVerification((value) => ({ ...value, academicOutcome: event.target.value as SelectionReviewVerification['academicOutcome'] })); setConfirmed(false)}}>
            <option value="unconfirmed">Unconfirmed — keep in review</option><option value="first_class">First Class verified by the reviewer</option><option value="approved_equivalent">Equivalent under an approved institution-specific rule</option><option value="requirement_not_met">Verified evidence does not meet the academic requirement</option>
          </select>
          <div className="grid gap-2 sm:grid-cols-2">
            {([['identityConfirmed','I confirmed this evidence belongs to this applicant.'],['academicEvidenceAuthenticated','I checked academic authenticity, not just OCR text.'],['leadershipEvidenceReviewed','I reviewed evidence supporting the leadership and impact claims.'],['noConflictOfInterest','I have no conflict of interest with this applicant.']] as const).map(([key, text]) => (
              <label key={key} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border border-zinc-200 p-3 text-sm leading-5"><input type="checkbox" className="mt-0.5 size-5 shrink-0" checked={verification[key]} onChange={(event) => setCheck(key,event.target.checked)} /><span>{text}</span></label>
            ))}
          </div>
          <Label htmlFor={`${applicationId}-reference`}>Private verification reference</Label>
          <Textarea id={`${applicationId}-reference`} rows={3} maxLength={2000} required={final} minLength={final ? 20 : undefined} value={verification.evidenceReference} onChange={(event) => {setVerification((value) => ({ ...value, evidenceReference: event.target.value })); setConfirmed(false)}} placeholder="Record the issuing source, method, date and reference checked. Do not collect unnecessary identity documents." />
          {verification.academicOutcome === 'approved_equivalent' && <div className="space-y-2"><Label htmlFor={`${applicationId}-equivalence`}>Approved equivalence rule and version</Label><Input id={`${applicationId}-equivalence`} maxLength={600} minLength={10} required={final} value={verification.equivalenceReference} onChange={(event) => {setVerification((value) => ({ ...value, equivalenceReference: event.target.value })); setConfirmed(false)}} /></div>}
        </section>
        <section aria-labelledby={`${applicationId}-scores-title`}><h4 id={`${applicationId}-scores-title`} className="font-semibold">2. Assess the published rubric</h4><p className="mt-1 text-sm text-zinc-600">Do not reward institution prestige, country, document design or polished writing instead of demonstrated impact.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{criteria.map(([key,label,maximum]) => <div key={key} className="space-y-2"><Label htmlFor={`${applicationId}-${key}`}>{label} / {maximum}</Label><Input id={`${applicationId}-${key}`} type="number" inputMode="decimal" min={0} max={maximum} step="0.01" required={final} value={scores[key]} onChange={(event) => {setScores((value) => ({ ...value, [key]: event.target.value })); setConfirmed(false)}} /></div>)}</div>
        </section>
        <section className="space-y-3" aria-labelledby={`${applicationId}-decision-title`}><h4 id={`${applicationId}-decision-title`} className="font-semibold">3. Explain and confirm the decision</h4>
          <Label htmlFor={`${applicationId}-verdict`}>Review outcome</Label><select id={`${applicationId}-verdict`} className="min-h-11 w-full rounded-md border border-input bg-white px-3 text-sm" value={verdict} onChange={(event) => {setVerdict(event.target.value as ReviewAssessment['verdict']);setConfirmed(false)}}><option value="needs_review">Needs more evidence or review — no final decision</option><option value="qualified">Qualified — subject to independent publication approval</option><option value="not_qualified">Not qualified — subject to independent publication approval</option></select>
          <Label htmlFor={`${applicationId}-notes`}>Private reasoning and evidence checked</Label><Textarea id={`${applicationId}-notes`} rows={3} required minLength={10} maxLength={4000} value={reviewerNotes} onChange={(event) => {setReviewerNotes(event.target.value);setConfirmed(false)}} />
          <Label htmlFor={`${applicationId}-reasons`}>Applicant-facing explanation</Label><Textarea id={`${applicationId}-reasons`} rows={4} required maxLength={4807} value={publicReasons} onChange={(event) => {setPublicReasons(event.target.value);setConfirmed(false)}} placeholder="One respectful reason per line. Explain what was established or remains unconfirmed. Never include another applicant, private notes or internal risk signals." />
          {final && <label className="flex min-h-11 items-start gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm leading-6"><input type="checkbox" className="mt-1 size-5 shrink-0" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} required /><span>I reviewed this decision and its applicant-facing explanation. Saving revokes earlier result links and invalidates existing ranking approvals.</span></label>}
        </section>
        <Button type="submit" className="min-h-11" disabled={saving || stale}>{saving && <Loader2 aria-hidden="true" className="mr-2 size-4 animate-spin" />}{saving ? 'Saving safely…' : final ? 'Save reviewed decision privately' : 'Save as unresolved — keep in review'}</Button>
      </fieldset>
    </form>
  )
}
