'use client'

import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  Loader2,
  ShieldCheck,
  XCircle,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { RankingApproval, RankingDetails, RankingEntry } from './ranking-types'
import { statusStyle } from './ranking-types'

type Props = {
  details: RankingDetails | null
  loading: boolean
  busyAction: string | null
  approvalNotes: string
  onApprovalNotesChange: (value: string) => void
  onDecision: (decision: RankingApproval['decision']) => void
  onPage: (page: number) => void
}

const applicantFor = (entry: RankingEntry) =>
  Array.isArray(entry.selection_applications)
    ? entry.selection_applications[0] ?? null
    : entry.selection_applications

const selectionLabel = (status: RankingEntry['selection_status']) => {
  if (status === 'proposed_winner') return 'Proposed winner'
  if (status === 'reserve') return 'Reserve'
  return 'Eligible'
}

export default function RankingRunDetails({
  details,
  loading,
  busyAction,
  approvalNotes,
  onApprovalNotesChange,
  onDecision,
  onPage,
}: Props) {
  if (loading && !details) {
    return (
      <Card className="min-w-0 border-zinc-200">
        <CardContent className="flex min-h-72 items-center justify-center">
          <Loader2 className="size-7 animate-spin text-orange-500" />
        </CardContent>
      </Card>
    )
  }

  if (!details) {
    return (
      <Card className="min-w-0 border-zinc-200">
        <CardContent className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
          <ListOrdered className="size-9 text-zinc-400" />
          <div className="font-semibold text-zinc-950">Open a ranking run</div>
        </CardContent>
      </Card>
    )
  }

  const approvals = details.run.selection_ranking_approvals ?? []
  const approvalCount = approvals.filter((approval) => approval.decision === 'approve').length

  return (
    <Card className="min-w-0 border-zinc-200">
      <CardHeader className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>{details.run.name}</CardTitle>
            <CardDescription className="mt-1">
              Policy {details.run.policy_version} · checksum{' '}
              <span className="font-mono">{details.run.input_checksum.slice(0, 16)}…</span>
            </CardDescription>
          </div>
          <span
            className={`w-fit rounded-full border px-2.5 py-1 text-xs font-semibold uppercase ${statusStyle(details.run.status)}`}
          >
            {details.run.status}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ['Eligible', details.run.eligible_count],
            ['Winners', details.run.proposed_winner_count],
            ['Reserve', details.run.reserve_count],
            ['Countries', details.run.countries_represented],
          ].map(([label, value]) => (
            <div key={String(label)} className="rounded-xl bg-zinc-50 p-3 text-center">
              <div className="text-xl font-bold tabular-nums text-zinc-950">{value}</div>
              <div className="text-xs text-zinc-500">{label}</div>
            </div>
          ))}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-950">Committee decisions</h3>
            <span className="text-xs text-zinc-500">{approvalCount}/2 approvals</span>
          </div>
          <div className="space-y-2">
            {approvals.map((approval) => (
              <div
                key={approval.id}
                className={`rounded-xl border p-3 text-sm ${
                  approval.decision === 'approve'
                    ? 'border-emerald-200 bg-emerald-50'
                    : 'border-rose-200 bg-rose-50'
                }`}
              >
                <div className="flex items-center gap-2 font-semibold">
                  {approval.decision === 'approve' ? (
                    <CheckCircle2 className="size-4 text-emerald-600" />
                  ) : (
                    <XCircle className="size-4 text-rose-600" />
                  )}
                  {approval.decision === 'approve' ? 'Approved' : 'Rejected'} by administrator{' '}
                  {approval.approver_id.slice(0, 8)}…
                </div>
                <p className="mt-1 leading-6 text-zinc-700">{approval.notes}</p>
              </div>
            ))}
            {approvals.length === 0 ? (
              <div className="rounded-xl border border-dashed p-3 text-sm text-zinc-500">
                No committee decision has been recorded.
              </div>
            ) : null}
          </div>

          {details.run.status === 'frozen' ? (
            <div className="mt-4 space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
              <div className="space-y-2">
                <Label htmlFor="approval-notes">Your independent committee note</Label>
                <Textarea
                  id="approval-notes"
                  rows={3}
                  placeholder="Explain what you checked before approving or rejecting this frozen ranking."
                  value={approvalNotes}
                  onChange={(event) => onApprovalNotesChange(event.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => onDecision('approve')}
                  disabled={Boolean(busyAction)}
                >
                  {busyAction === `approve-${details.run.id}` ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="mr-2 size-4" />
                  )}
                  Approve ranking
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onDecision('reject')}
                  disabled={Boolean(busyAction)}
                >
                  {busyAction === `reject-${details.run.id}` ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <XCircle className="mr-2 size-4" />
                  )}
                  Reject and void
                </Button>
              </div>
            </div>
          ) : null}
        </section>

        <section>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-zinc-950">Ranked applicants</h3>
            <span className="text-xs text-zinc-500">{details.pagination.total} entries</span>
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-3 py-3">Overall</th>
                  <th className="px-3 py-3">Applicant</th>
                  <th className="px-3 py-3">Country rank</th>
                  <th className="px-3 py-3">Score</th>
                  <th className="px-3 py-3">Selection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {details.entries.map((entry) => {
                  const applicant = applicantFor(entry)
                  return (
                    <tr key={entry.id}>
                      <td className="px-3 py-3 font-bold tabular-nums text-zinc-950">
                        #{entry.overall_rank}
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-semibold text-zinc-950">
                          {applicant?.full_name ?? 'Applicant'}
                        </div>
                        <div className="mt-0.5 text-xs text-zinc-500">
                          {[entry.country, applicant?.institution, applicant?.primary_email]
                            .filter(Boolean)
                            .join(' · ')}
                        </div>
                      </td>
                      <td className="px-3 py-3 tabular-nums text-zinc-700">
                        #{entry.country_rank} in {entry.country}
                      </td>
                      <td className="px-3 py-3 font-semibold tabular-nums text-zinc-900">
                        {Number(entry.total_score).toFixed(2)}
                      </td>
                      <td className="px-3 py-3 text-zinc-700">
                        {selectionLabel(entry.selection_status)}
                      </td>
                    </tr>
                  )
                })}
                {details.entries.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-zinc-500">
                      This ranking run has no entries.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {details.pagination.pageCount > 1 ? (
            <div className="mt-3 flex items-center justify-between gap-3">
              <Button
                size="sm"
                variant="outline"
                disabled={details.pagination.page <= 1 || loading}
                onClick={() => onPage(details.pagination.page - 1)}
              >
                <ChevronLeft className="mr-1 size-4" /> Previous
              </Button>
              <span className="text-xs text-zinc-500">
                Page {details.pagination.page} of {details.pagination.pageCount}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={details.pagination.page >= details.pagination.pageCount || loading}
                onClick={() => onPage(details.pagination.page + 1)}
              >
                Next <ChevronRight className="ml-1 size-4" />
              </Button>
            </div>
          ) : null}
        </section>
      </CardContent>
    </Card>
  )
}
