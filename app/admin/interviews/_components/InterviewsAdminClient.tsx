'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, Plus, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ResponsiveTable } from '@/components/ui/responsive-table'
import type { InterviewRow } from '@/lib/interviews/mappers'
import PageHeader from '../../components/PageHeader'

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
    <div className="space-y-6 pb-4">
      <PageHeader
        eyebrow="Stories"
        title="Impact interviews"
        description={`${interviews.length} interviews · ${pendingCount} applications awaiting review`}
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => void load()}
              className="rounded-xl border-zinc-200 bg-white font-medium shadow-none"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              Refresh
            </Button>
            <Button
              onClick={() => setShowForm((value) => !value)}
              className="rounded-xl bg-zinc-950 font-medium text-white shadow-none hover:bg-zinc-800"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              {showForm ? 'Close editor' : 'New interview'}
            </Button>
          </>
        }
      />

      <Tabs defaultValue="interviews" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl bg-zinc-100 p-1 sm:w-auto sm:min-w-[360px]">
          <TabsTrigger value="interviews" className="min-h-10 rounded-lg font-medium data-[state=active]:bg-white data-[state=active]:shadow-none">
            Interviews <span className="ml-1 text-zinc-400">{interviews.length}</span>
          </TabsTrigger>
          <TabsTrigger value="applications" className="min-h-10 rounded-lg font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-500 data-[state=active]:to-amber-500 data-[state=active]:text-white data-[state=active]:shadow-none">
            Applications <span className="ml-1">{pendingCount}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="interviews" className="space-y-4">
          {showForm ? (
            <section className="admin-panel overflow-hidden" aria-labelledby="interview-editor-title">
              <div className="border-b border-orange-100 bg-orange-50/70 px-4 py-4 sm:px-5">
                <p className="admin-kicker">Draft workspace</p>
                <h2 id="interview-editor-title" className="mt-1 text-lg font-semibold text-zinc-950">Shape the interview story</h2>
                <p className="mt-1 max-w-2xl text-sm leading-5 text-zinc-600">Start with the essentials. You can keep it private as a draft until the copy and media are ready.</p>
              </div>
              <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-5 [&_input]:mt-1.5 [&_input]:min-h-11 [&_textarea]:mt-1.5 [&_label]:text-xs [&_label]:font-medium [&_label]:text-zinc-600">
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
                  className="mt-1.5 flex min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
              <div className="flex flex-col-reverse gap-2 border-t border-zinc-100 pt-4 sm:col-span-2 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={() => setShowForm(false)} disabled={saving} className="min-h-11 font-medium">Cancel</Button>
                <Button onClick={() => void createInterview()} disabled={saving} className="min-h-11 bg-zinc-950 font-medium text-white hover:bg-zinc-800">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : null}
                  Save as draft
                </Button>
              </div>
              </div>
            </section>
          ) : null}

          <ResponsiveTable
            data={interviews}
            getRowKey={(interview) => interview.id}
            empty={
              <div className="admin-panel px-4 py-12 text-center">
                <p className="text-sm font-medium text-zinc-900">No interviews yet</p>
                <p className="mt-1 text-xs text-zinc-500">Create a draft when the first story is ready.</p>
              </div>
            }
            columns={[
              {
                key: 'title',
                header: 'Title',
                cell: (interview) => (
                  <span className="font-medium text-slate-900">{interview.title}</span>
                ),
              },
              {
                key: 'awardee',
                header: 'Awardee',
                cell: (interview) => (
                  <span className="text-slate-600">{interview.awardee_name}</span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                cell: (interview) => (
                  <select
                    value={interview.status}
                    onChange={(event) =>
                      void updateInterview(interview.id, { status: event.target.value })
                    }
                    className="min-h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs"
                    aria-label={`Status for ${interview.title}`}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                ),
              },
              {
                key: 'featured',
                header: 'Featured',
                cell: (interview) => (
                  <input
                    type="checkbox"
                    checked={interview.featured}
                    onChange={(event) =>
                      void updateInterview(interview.id, { featured: event.target.checked })
                    }
                    className="h-5 w-5 accent-[#181715]"
                    aria-label={`Feature ${interview.title}`}
                  />
                ),
              },
              {
                key: 'actions',
                header: '',
                className: 'text-right',
                cell: (interview) => (
                  <a
                    href={`/interviews/${interview.slug}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center text-xs font-medium text-orange-700 hover:underline"
                  >
                    View
                  </a>
                ),
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="applications" className="space-y-3">
          {applications.map((application) => (
            <article key={application.id} className="admin-panel p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 gap-3 sm:gap-4">
                  {application.headshotUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={application.headshotUrl}
                      alt=""
                      className="h-14 w-14 shrink-0 rounded-xl object-cover sm:h-16 sm:w-16"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-950 sm:text-base">
                      {application.full_name}
                      <span
                        className={
                          application.verification === 'matched'
                            ? 'ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800'
                            : 'ml-2 inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800'
                        }
                      >
                        {application.verification === 'matched' ? 'Matched' : 'Needs verification'}
                      </span>
                    </p>
                    <p className="mt-1 text-xs leading-5 text-zinc-500 sm:text-sm">
                      {application.email} · {application.country} · {application.cohort_year} ·
                      prefers {application.preferred_format}
                    </p>
                    {application.linkedin_url ? (
                      <a
                        href={application.linkedin_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center text-xs font-medium text-orange-700 hover:underline"
                      >
                        LinkedIn
                      </a>
                    ) : null}
                  </div>
                </div>

                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
                  <select
                    value={application.status}
                    onChange={(event) =>
                      void updateApplication(application.id, { status: event.target.value })
                    }
                    className="min-h-11 rounded-lg border border-zinc-200 bg-white px-3 text-xs capitalize"
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
                    className="min-h-11 rounded-lg border-zinc-200 font-medium shadow-none"
                  >
                    Create interview
                  </Button>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap border-t border-zinc-100 pt-4 text-sm font-normal leading-6 text-zinc-600">
                {application.impact_story}
              </p>

              <Textarea
                rows={2}
                defaultValue={application.admin_notes ?? ''}
                placeholder="Notes"
                className="mt-3 min-h-20 border-zinc-200 text-sm"
                aria-label={`Notes for ${application.full_name}`}
                onBlur={(event) => {
                  if (event.target.value !== (application.admin_notes ?? '')) {
                    void updateApplication(application.id, { admin_notes: event.target.value })
                  }
                }}
              />
            </article>
          ))}

          {applications.length === 0 ? (
            <div className="admin-panel border-dashed px-6 py-12 text-center">
              <p className="text-sm font-medium text-zinc-900">No interview applications yet</p>
              <p className="mt-1 text-xs text-zinc-500">New submissions will appear here for review.</p>
            </div>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  )
}
