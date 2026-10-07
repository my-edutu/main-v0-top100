'use client'

import { useCallback, useEffect, useState } from 'react'
import { CalendarDays, Clock3, RefreshCw, Video } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { RouteSection } from '@/app/dashboard/_components/route-section'
import { useDashboardMember } from '@/app/dashboard/_providers/dashboard-member'
import { InterviewApplicationDraft, InterviewRequestForm } from './interview-request-form'

type Booking = {
  id: string
  starts_at: string
  ends_at: string
  state: string
  revision: number
  expires_at: string | null
  meeting_url: string | null
  member_reason: string | null
}
type Snapshot = {
  application: InterviewApplicationDraft | null
  booking: Booking | null
  teamTimezone: string
  events: Array<{ action: string; created_at: string }>
}

function formatDate(value: string, timezone: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full', timeStyle: 'short', timeZone: timezone }).format(new Date(value))
}

function RequestSkeleton() {
  return (
    <section aria-label="Loading interview request" aria-busy="true" className="overflow-hidden rounded-2xl border border-neutral-200 bg-white">
      <div className="border-b border-neutral-200 p-5 sm:p-7">
        <div className="h-4 w-24 animate-pulse rounded bg-neutral-100" />
        <div className="mt-4 h-2 animate-pulse rounded-full bg-neutral-100" />
        <div className="mt-6 h-6 w-48 animate-pulse rounded bg-neutral-100" />
        <div className="mt-2 h-4 w-64 max-w-full animate-pulse rounded bg-neutral-100" />
      </div>
      <div className="space-y-5 p-5 sm:p-7">
        <div className="h-16 animate-pulse rounded-xl bg-neutral-50" />
        <div className="h-12 animate-pulse rounded-lg bg-neutral-50" />
        <div className="h-12 animate-pulse rounded-lg bg-neutral-50" />
        <div className="h-40 animate-pulse rounded-lg bg-neutral-50" />
      </div>
      <span className="sr-only">Loading your interview request</span>
    </section>
  )
}

export default function InterviewRequestPage() {
  const { member } = useDashboardMember()
  const [snapshot, setSnapshot] = useState<Snapshot>({ application: null, booking: null, events: [], teamTimezone: 'Africa/Lagos' })
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setLoadError('')
    try {
      const response = await fetch('/api/member/interview', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'We could not load your interview request.')
      setSnapshot(data)
    } catch (cause) {
      setLoadError(cause instanceof Error ? cause.message : 'We could not load your interview request.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function bookingAction(action: 'accept' | 'request_change' | 'member_cancel') {
    const application = snapshot.application
    if (!application || saving) return
    setSaving(true)
    try {
      const response = await fetch(`/api/member/interview/${application.id}/actions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, revision: snapshot.booking?.revision ?? 0 }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'We could not update your interview request.')
      toast.success(action === 'accept' ? 'Interview time confirmed.' : action === 'member_cancel' ? 'Your interview request has been withdrawn.' : 'The team will arrange another time.')
      await load()
    } catch (cause) {
      toast.error(cause instanceof Error ? cause.message : 'We could not update your interview request.')
    } finally {
      setSaving(false)
    }
  }

  const application = snapshot.application
  const booking = snapshot.booking
  const memberInfo = { name: member.name, email: member.email }
  const showRequestForm = !application || editing || !['awaiting_review', 'approved'].includes(application.booking_status)
  const previewUnavailableForm = process.env.NODE_ENV === 'development' && Boolean(loadError)

  return (
    <RouteSection title="Request an interview" description="Share your story with the Africa Future Leaders team.">
      <div className="mx-auto max-w-2xl space-y-5">
        {loading ? <RequestSkeleton /> : null}

        {!loading && loadError && !previewUnavailableForm ? (
          <section role="alert" className="rounded-2xl border border-orange-200 bg-white p-6 sm:p-8">
            <div className="mx-auto max-w-md text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-orange-50 text-orange-800"><CalendarDays className="size-6" aria-hidden="true" /></div>
              <h2 className="mt-4 text-lg font-semibold text-neutral-950">We can’t load interview scheduling right now</h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">{loadError}</p>
              <Button type="button" onClick={() => void load()} className="mt-5 min-h-11 bg-orange-600 text-white hover:bg-orange-700"><RefreshCw className="mr-2 size-4" />Try again</Button>
            </div>
          </section>
        ) : null}

        {!loading && (!loadError || previewUnavailableForm) && showRequestForm ? (
          <InterviewRequestForm
            key={editing ? application?.id ?? 'edit-request' : 'new-request'}
            member={memberInfo}
            application={editing ? application : null}
            onSaved={async () => { setEditing(false); await load() }}
            onCancelEdit={() => setEditing(false)}
            submissionEnabled={!loadError}
          />
        ) : null}

        {!loading && !loadError && application && !editing && ['awaiting_review', 'approved'].includes(application.booking_status) ? (
          <section className="space-y-5 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-7">
            <header className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm text-neutral-600">Your interview request</p>
                <h2 className="mt-1 break-words text-xl font-semibold text-neutral-950">{application.interview_topic}</h2>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1.5 text-sm font-medium capitalize text-orange-900">{booking?.state?.replaceAll('_', ' ') ?? application.booking_status.replaceAll('_', ' ')}</span>
            </header>

            <div className="rounded-xl border border-neutral-200 p-4">
              <h3 className="text-sm font-medium">Your story</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-neutral-600">{application.impact_story}</p>
            </div>

            {booking ? (
              <div className="space-y-3 rounded-xl bg-orange-50 p-4">
                <p className="flex items-center gap-2 font-semibold text-neutral-950"><CalendarDays className="size-5" aria-hidden="true" />{booking.state === 'confirmed' ? 'Interview confirmed' : 'Proposed interview time'}</p>
                <p className="font-medium">{formatDate(booking.starts_at, application.member_timezone)}</p>
                <p className="flex items-center gap-2 text-sm text-neutral-600"><Clock3 className="size-4" aria-hidden="true" />30 minutes · Team time: {formatDate(booking.starts_at, snapshot.teamTimezone)}</p>
                {booking.state === 'proposed' && booking.expires_at ? <p className="text-sm text-amber-900">Please respond by {formatDate(booking.expires_at, application.member_timezone)}.</p> : null}
                {booking.state === 'expired' ? <p role="status" className="text-sm text-amber-900">This proposed time expired. The team will arrange another time.</p> : null}
                {booking.state === 'declined' ? <p className="text-sm text-neutral-700">That time was released. The team will arrange another time.</p> : null}
                {['expired', 'declined', 'cancelled'].includes(booking.state) ? <Button disabled={saving} variant="ghost" onClick={() => void bookingAction('member_cancel')} className="min-h-11">Withdraw request</Button> : null}
                {booking.member_reason ? <p className="text-sm text-neutral-700">Message from the team: {booking.member_reason}</p> : null}
                {booking.meeting_url && booking.state === 'confirmed' ? <a className="inline-flex min-h-11 items-center gap-2 underline underline-offset-2" href={booking.meeting_url} target="_blank" rel="noreferrer"><Video className="size-4" aria-hidden="true" />Join interview</a> : null}
                {booking.state === 'proposed' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button disabled={saving} onClick={() => void bookingAction('accept')} className="min-h-11 bg-orange-600 text-white hover:bg-orange-700">Accept this time</Button>
                    <Button disabled={saving} variant="outline" onClick={() => void bookingAction('request_change')} className="min-h-11">Request another time</Button>
                  </div>
                ) : booking.state === 'confirmed' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    <a href={`/api/member/interview/${booking.id}/calendar`} className="inline-flex min-h-11 items-center rounded-lg border border-neutral-300 bg-white px-4 text-sm font-medium">Add to calendar</a>
                    <Button disabled={saving} variant="outline" onClick={() => void bookingAction('request_change')}>Request a change</Button>
                    <Button disabled={saving} variant="ghost" onClick={() => void bookingAction('member_cancel')}>Cancel interview</Button>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="rounded-xl bg-neutral-50 p-4">
                <p className="font-medium text-neutral-900">{application.booking_status === 'awaiting_review' ? 'Under review' : 'The team is arranging a time'}</p>
                <p className="mt-1 text-sm leading-6 text-neutral-600">Your interview is not scheduled until you accept a time proposed by the team.</p>
                {application.booking_status === 'awaiting_review' ? <Button variant="outline" disabled={saving} onClick={() => setEditing(true)} className="mt-3 min-h-11">Edit request</Button> : null}
                <Button variant="ghost" disabled={saving} onClick={() => void bookingAction('member_cancel')} className="mt-3 min-h-11">Withdraw request</Button>
              </div>
            )}

            <div className="border-t border-neutral-200 pt-4">
              <h3 className="text-sm font-medium">Request history</h3>
              {snapshot.events.length ? <ol className="mt-3 space-y-2">{snapshot.events.map((event, index) => <li key={`${event.action}-${index}`} className="border-l-2 border-orange-200 pl-3 text-sm"><span className="capitalize">{event.action.replaceAll('_', ' ')}</span><span className="ml-2 text-neutral-500">{formatDate(event.created_at, application.member_timezone)}</span></li>)}</ol> : <p className="mt-2 text-sm text-neutral-500">Your request updates will appear here.</p>}
            </div>
          </section>
        ) : null}
      </div>
    </RouteSection>
  )
}
