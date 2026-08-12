'use client'

import { type FormEvent, useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createFeatureSubmission,
  fetchMemberHubState,
  type MemberFeatureSubmission,
  type MemberProfile,
} from '@/lib/member-hub'
import { cn } from '@/lib/utils'
import { persistThenRefresh } from '../_lib/persistence-workflows'

const statusStyles: Record<MemberFeatureSubmission['status'], string> = {
  pending: 'bg-amber-100 text-amber-800',
  reviewing: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  published: 'bg-orange-600 text-white',
}

export function FeatureSection({ member }: { member: MemberProfile }) {
  const [submissions, setSubmissions] = useState<MemberFeatureSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [historyWarning, setHistoryWarning] = useState('')

  async function loadSubmissions({ secondary = false } = {}) {
    try {
      const state = await fetchMemberHubState()
      setSubmissions(state.featureSubmissions)
      setHistoryWarning('')
      return true
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load your submissions.'
      if (secondary) {
        setHistoryWarning('Your request was sent, but we could not refresh the full submission history.')
      } else {
        setError(message)
      }
      return false
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSubmissions()
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const title = String(form.get('title') || '').trim()
    const summary = String(form.get('summary') || '').trim()
    const category = String(form.get('category') || 'bio') as MemberFeatureSubmission['category']

    if (!title || !summary) {
      setSaved(false)
      setError('Add a title and short summary before submitting.')
      return
    }

    try {
      setSaving(true)
      setSaved(false)
      setError('')
      const result = await persistThenRefresh({
        persist: () => createFeatureSubmission({
          memberId: member.id,
          memberName: member.name,
          title,
          category,
          summary,
          contactEmail: member.email,
        }),
        applyPersisted: (created) => {
          setSubmissions((current) => [created, ...current.filter(({ id }) => id !== created.id)])
        },
        refresh: async () => {
          const refreshed = await loadSubmissions({ secondary: true })
          if (!refreshed) throw new Error('Submission history refresh failed')
        },
        refreshWarning: 'Your request was sent, but we could not refresh the full submission history.',
      })
      formElement.reset()
      setSaved(true)
      toast.success('Sent to the AFL team for review.')
      setHistoryWarning(result.warning)
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not submit this feature request.'
      setError(message)
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
      <form onSubmit={handleSubmit} className="rounded-[24px] border border-rose-200 bg-[#F8DCE6] p-5 sm:p-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6E1636]">Magazine and homepage</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-[#171412]">Pitch a story to the AFL team.</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#625B52]">Share a BIO update, awardee story, product, or impact project for editorial review.</p>

        <div className="mt-6 grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="feature-title" className="font-bold">Feature title</Label>
            <Input id="feature-title" name="title" required placeholder="My climate project for rural schools" className="h-14 rounded-[14px] border-rose-200 bg-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feature-category" className="font-bold">Category</Label>
            <select id="feature-category" name="category" defaultValue="bio" className="h-14 w-full rounded-[14px] border border-rose-200 bg-white px-4 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-[#171412]">
              <option value="bio">BIO/profile spotlight</option>
              <option value="story">Awardee story</option>
              <option value="product">Product/startup</option>
              <option value="project">Impact project</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="feature-summary" className="font-bold">Summary</Label>
            <Textarea id="feature-summary" name="summary" required placeholder="Tell the editorial team what should be featured." className="min-h-36 rounded-[16px] border-rose-200 bg-white" />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={saving} className="min-h-12 rounded-full bg-[#171412] px-7 font-extrabold text-white hover:bg-[#312B27]">
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Send className="mr-2 h-4 w-4" aria-hidden="true" />}
            {saving ? 'Sending...' : 'Submit to the team'}
          </Button>
          {saved ? <span role="status" className="text-sm font-bold text-emerald-800">Sent for review.</span> : null}
          {error ? <span role="alert" className="text-sm font-bold text-rose-800">{error}</span> : null}
          {historyWarning ? <span role="status" className="text-sm font-bold text-amber-800">{historyWarning}</span> : null}
        </div>
      </form>

      <section className="rounded-[24px] border border-[#E7DDCF] bg-white p-5 sm:p-7">
        <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-orange-700">Your submissions</p>
        <h2 className="mt-2 text-2xl font-extrabold tracking-tight">Track each request.</h2>
        {loading ? (
          <p role="status" className="mt-5 text-sm font-semibold text-[#625B52]">Loading submissions...</p>
        ) : submissions.length === 0 ? (
          <p className="mt-5 rounded-[16px] border border-dashed border-[#E7DDCF] bg-[#FBF7EF] p-4 text-sm font-semibold leading-6 text-[#625B52]">Nothing submitted yet. Review status will appear here after your first pitch.</p>
        ) : (
          <div className="mt-5 grid gap-3">
            {submissions.map((submission) => (
              <article key={submission.id} className="rounded-[16px] border border-[#E7DDCF] bg-[#FBF7EF] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.12em] text-[#625B52]">{formatDate(submission.createdAt)} · {submission.category}</p>
                    <h3 className="mt-1 font-extrabold text-[#171412]">{submission.title}</h3>
                  </div>
                  <span className={cn('rounded-full px-3 py-1 text-xs font-extrabold capitalize', statusStyles[submission.status])}>{submission.status}</span>
                </div>
                <p className="mt-2 line-clamp-3 text-sm font-semibold leading-6 text-[#625B52]">{submission.summary}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function formatDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Submitted'
    : date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
