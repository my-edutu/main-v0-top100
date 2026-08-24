'use client'

import { FormEvent, useMemo, useState } from 'react'
import { CheckCircle2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export type ReviewAssessment = {
  verdict: 'qualified' | 'not_qualified' | 'needs_review'
  total_score: number
  score_breakdown: Record<string, number>
  public_reasons: string[]
}

const requestJson = async <T,>(url: string, init: RequestInit): Promise<T> => {
  const response = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init.headers ?? {}) },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok) throw new Error(payload?.message || `Request failed with HTTP ${response.status}`)
  return payload as T
}

const numberValue = (value: unknown, fallback = 0) =>
  typeof value === 'number' && Number.isFinite(value) ? value : fallback

export default function HumanReviewForm({
  applicationId,
  applicantName,
  assessment,
  onSaved,
}: {
  applicationId: string
  applicantName: string
  assessment: ReviewAssessment | null
  onSaved: () => Promise<void> | void
}) {
  const [saving, setSaving] = useState(false)
  const [verdict, setVerdict] = useState<ReviewAssessment['verdict']>(
    assessment?.verdict ?? 'needs_review',
  )
  const [scores, setScores] = useState({
    academic: numberValue(assessment?.score_breakdown?.academic),
    leadership: numberValue(assessment?.score_breakdown?.leadership),
    impact: numberValue(assessment?.score_breakdown?.impact),
    initiative: numberValue(assessment?.score_breakdown?.initiative),
    communication: numberValue(assessment?.score_breakdown?.communication),
  })
  const [publicReasons, setPublicReasons] = useState(
    (assessment?.public_reasons ?? []).join('\n'),
  )
  const [reviewerNotes, setReviewerNotes] = useState('')

  const total = useMemo(
    () =>
      Math.round(
        (scores.academic +
          scores.leadership +
          scores.impact +
          scores.initiative +
          scores.communication) *
          100,
      ) / 100,
    [scores],
  )

  const updateScore = (key: keyof typeof scores, value: string) => {
    const parsed = Number(value)
    setScores((current) => ({ ...current, [key]: Number.isFinite(parsed) ? parsed : 0 }))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const reasons = publicReasons
      .split(/\n+/)
      .map((reason) => reason.trim())
      .filter(Boolean)

    setSaving(true)
    try {
      await requestJson(`/api/admin/selection/applications/${applicationId}/review`, {
        method: 'POST',
        body: JSON.stringify({
          verdict,
          scoreBreakdown: scores,
          publicReasons: reasons,
          reviewerNotes,
        }),
      })
      toast.success(`Human review saved for ${applicantName}.`)
      setReviewerNotes('')
      await onSaved()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save the human review')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-orange-100 bg-orange-50/50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-sm font-semibold text-zinc-950">Human review decision</h3>
          <p className="mt-1 text-xs leading-5 text-zinc-600">
            Changing a decision unpublishes any older result until the new decision is checked and published again.
          </p>
        </div>
        <div className="rounded-xl border border-orange-200 bg-white px-3 py-2 text-sm font-bold tabular-nums text-orange-700">
          {total}/100
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-5">
        {[
          ['academic', 'Academic', 30],
          ['leadership', 'Leadership', 25],
          ['impact', 'Impact', 25],
          ['initiative', 'Initiative', 10],
          ['communication', 'Communication', 10],
        ].map(([key, label, maximum]) => (
          <div key={String(key)} className="space-y-1.5">
            <Label htmlFor={`${applicationId}-${String(key)}`} className="text-xs">
              {String(label)} / {Number(maximum)}
            </Label>
            <Input
              id={`${applicationId}-${String(key)}`}
              type="number"
              min={0}
              max={Number(maximum)}
              step="0.01"
              value={scores[key as keyof typeof scores]}
              onChange={(event) => updateScore(key as keyof typeof scores, event.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor={`${applicationId}-verdict`}>Final verdict</Label>
          <select
            id={`${applicationId}-verdict`}
            className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
            value={verdict}
            onChange={(event) => setVerdict(event.target.value as ReviewAssessment['verdict'])}
          >
            <option value="qualified">Qualified</option>
            <option value="not_qualified">Not qualified</option>
            <option value="needs_review">Needs more evidence/review</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${applicationId}-notes`}>Private reviewer note</Label>
          <Textarea
            id={`${applicationId}-notes`}
            rows={3}
            placeholder="State what you checked and why you made this decision. This is never shown to the applicant."
            value={reviewerNotes}
            onChange={(event) => setReviewerNotes(event.target.value)}
            required
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor={`${applicationId}-reasons`}>Applicant-facing explanation</Label>
          <Textarea
            id={`${applicationId}-reasons`}
            rows={4}
            placeholder="Write one clear reason per line. Do not disclose fraud-detection rules, other applicants, or internal integrity signals."
            value={publicReasons}
            onChange={(event) => setPublicReasons(event.target.value)}
            required
          />
        </div>
      </div>

      <Button type="submit" size="sm" className="mt-4" disabled={saving}>
        {saving ? (
          <Loader2 className="mr-2 size-4 animate-spin" />
        ) : (
          <CheckCircle2 className="mr-2 size-4" />
        )}
        Save reviewed decision
      </Button>
    </form>
  )
}
