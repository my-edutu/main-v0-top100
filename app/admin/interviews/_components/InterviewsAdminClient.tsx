'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { InterviewRow } from '@/lib/interviews/mappers'

type Application = {
  id: string
  full_name: string
  email: string
  phone: string | null
  country: string | null
  cohort_year: number | null
  role_title: string | null
  organisation: string | null
  bio: string
  impact_story: string
  linkedin_url: string | null
  other_link: string | null
  preferred_format: string
  verification: 'matched' | 'unmatched'
  status: string
  admin_notes: string | null
  headshotUrl: string | null
  created_at: string
}

const STATUSES = ['pending', 'shortlisted', 'scheduled', 'published', 'declined'] as const

const emptyDraft = {
  title: '',
  videoUrl: '',
  format: 'video',
  awardee_name: '',
  country: '',
  cohort_year: '',
  pull_quote: '',
  summary: '',
  body: '',
  duration_seconds: '',
  status: 'draft',
  sort_order: '0',
}

export default function InterviewsAdminClient() {
  const [interviews, setInterviews] = useState<InterviewRow[]>([])
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [draft, setDraft] = useState({ ...emptyDraft })
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [interviewsResponse, applicationsResponse] = await Promise.all([
        fetch('/api/admin/interviews'),
        fetch('/api/admin/interview-applications'),
      ])

      const interviewsData = await interviewsResponse.json()
      const applicationsData = await applicationsResponse.json()

      setInterviews(interviewsData.interviews ?? [])
      setApplications(applicationsData.applications ?? [])
    } catch {
      toast.error('Could not load interviews')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createInterview = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/admin/interviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...draft,
          cohort_year: draft.cohort_year ? Number(draft.cohort_year) : null,
          duration_seconds: draft.duration_seconds ? Number(draft.duration_seconds) : null,
          sort_order: Number(draft.sort_order) || 0,
        }),
      })

      const data = await response.json()
      if (!response.ok || !data.success) {
        toast.error(data.message || 'Could not save the interview')
        return
      }

      toast.success('Interview saved as a draft')
      setDraft({ ...emptyDraft })
      setShowForm(false)
      await load()
    } catch {
      toast.error('Could not save the interview')
    } finally {
      setSaving(false)
    }
  }

  const updateInterview = async (id: string, patch: Record<string, unknown>) => {
    const response = await fetch('/api/admin/interviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      toast.error(data.message || 'Update failed')
      return
    }

    await load()
  }

  const updateApplication = async (id: string, patch: Record<string, unknown>) => {
    const response = await fetch('/api/admin/interview-applications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...patch }),
    })

    const data = await response.json()
    if (!response.ok || !data.success) {
      toast.error(data.message || 'Update failed')
      return
    }

    toast.success('Application updated')
    await load()
  }

  const createFromApplication = (application: Application) => {
    setDraft({
      ...emptyDraft,
      awardee_name: application.full_name,
      country: application.country ?? '',
      cohort_year: application.cohort_year ? String(application.cohort_year) : '',
      summary: application.bio.slice(0, 240),
      format: application.preferred_format === 'written' ? 'written' : 'video',
    })
    setShowForm(true)
    toast.info(`Draft started for ${application.full_name} — switch to the Interviews tab`)
  }

  const pendingCount = applications.filter((application) => application.status === 'pending').length

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Impact Interviews</h1>
          <p className="text-sm text-slate-500">
            {interviews.length} interviews · {pendingCount} pending applications
          </p>
        </div>
        <Button variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="interviews">
        <TabsList>
          <TabsTrigger value="interviews">Interviews</TabsTrigger>
          <TabsTrigger value="applications">Applications ({pendingCount})</TabsTrigger>
        </TabsList>

        <TabsContent value="interviews" className="space-y-4 pt-4">
          <Button onClick={() => setShowForm((value) => !value)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            {showForm ? 'Close' : 'New interview'}
          </Button>

          {showForm ? (
            <div className="grid gap-4 rounded-2xl border border-orange-100 bg-white p-6 sm:grid-cols-2">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={draft.title}
                  onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="awardee_name">Awardee name</Label>
                <Input
                  id="awardee_name"
                  value={draft.awardee_name}
                  onChange={(event) => setDraft({ ...draft, awardee_name: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="format">Format</Label>
                <select
                  id="format"
                  value={draft.format}
                  onChange={(event) => setDraft({ ...draft, format: event.target.value })}
                  className="mt-1.5 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="video">Video</option>
                  <option value="written">Written Q&amp;A</option>
                </select>
              </div>
              <div>
                <Label htmlFor="videoUrl">YouTube URL</Label>
                <Input
                  id="videoUrl"
                  value={draft.videoUrl}
                  onChange={(event) => setDraft({ ...draft, videoUrl: event.target.value })}
                  placeholder="https://youtu.be/…"
                />
              </div>
              <div>
                <Label htmlFor="duration_seconds">Duration (seconds)</Label>
                <Input
                  id="duration_seconds"
                  value={draft.duration_seconds}
                  onChange={(event) => setDraft({ ...draft, duration_seconds: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={draft.country}
                  onChange={(event) => setDraft({ ...draft, country: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="cohort_year">Cohort year</Label>
                <Input
                  id="cohort_year"
                  value={draft.cohort_year}
                  onChange={(event) => setDraft({ ...draft, cohort_year: event.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="sort_order">Sort order</Label>
                <Input
                  id="sort_order"
                  value={draft.sort_order}
                  onChange={(event) => setDraft({ ...draft, sort_order: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="pull_quote">Pull quote</Label>
                <Input
                  id="pull_quote"
                  value={draft.pull_quote}
                  onChange={(event) => setDraft({ ...draft, pull_quote: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  rows={2}
                  value={draft.summary}
                  onChange={(event) => setDraft({ ...draft, summary: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="body">Body (HTML)</Label>
                <Textarea
                  id="body"
                  rows={6}
                  value={draft.body}
                  onChange={(event) => setDraft({ ...draft, body: event.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button onClick={() => void createInterview()} disabled={saving}>
                  {saving ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Save as draft
                </Button>
              </div>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-2xl border border-orange-100">
            <table className="w-full text-left text-sm">
              <thead className="bg-orange-50 text-xs uppercase tracking-wider text-orange-800">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Awardee</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Featured</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-orange-50">
                {interviews.map((interview) => (
                  <tr key={interview.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{interview.title}</td>
                    <td className="px-4 py-3 text-slate-600">{interview.awardee_name}</td>
                    <td className="px-4 py-3">
                      <select
                        value={interview.status}
                        onChange={(event) =>
                          void updateInterview(interview.id, { status: event.target.value })
                        }
                        className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                        aria-label={`Status for ${interview.title}`}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={interview.featured}
                        onChange={(event) =>
                          void updateInterview(interview.id, { featured: event.target.checked })
                        }
                        className="h-4 w-4 accent-orange-600"
                        aria-label={`Feature ${interview.title}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <a
                        href={`/interviews/${interview.slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-orange-700 hover:underline"
                      >
                        View
                      </a>
                    </td>
                  </tr>
                ))}
                {interviews.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                      No interviews yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="applications" className="space-y-4 pt-4">
          {applications.map((application) => (
            <div key={application.id} className="rounded-2xl border border-orange-100 bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex gap-4">
                  {application.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={application.headshotUrl}
                      alt=""
                      className="h-16 w-16 rounded-full object-cover"
                    />
                  ) : null}
                  <div>
                    <p className="font-semibold text-slate-900">
                      {application.full_name}
                      <span
                        className={
                          application.verification === 'matched'
                            ? 'ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800'
                            : 'ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800'
                        }
                      >
                        {application.verification === 'matched' ? 'Matched' : 'Needs verification'}
                      </span>
                    </p>
                    <p className="text-sm text-slate-500">
                      {application.email} · {application.country} · {application.cohort_year} ·
                      prefers {application.preferred_format}
                    </p>
                    {application.linkedin_url ? (
                      <a
                        href={application.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-orange-700 hover:underline"
                      >
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <select
                    value={application.status}
                    onChange={(event) =>
                      void updateApplication(application.id, { status: event.target.value })
                    }
                    className="rounded-md border border-slate-200 px-2 py-1 text-xs"
                    aria-label={`Status for ${application.full_name}`}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createFromApplication(application)}
                  >
                    Create interview
                  </Button>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                {application.impact_story}
              </p>

              <Textarea
                rows={2}
                defaultValue={application.admin_notes ?? ''}
                placeholder="Notes"
                className="mt-3"
                aria-label={`Notes for ${application.full_name}`}
                onBlur={(event) => {
                  if (event.target.value !== (application.admin_notes ?? '')) {
                    void updateApplication(application.id, { admin_notes: event.target.value })
                  }
                }}
              />
            </div>
          ))}

          {applications.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-orange-200 px-6 py-12 text-center text-sm text-slate-500">
              No applications yet.
            </p>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
