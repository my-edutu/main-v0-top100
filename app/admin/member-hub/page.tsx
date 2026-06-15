'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, Clock, Send, Sparkles, Users, type LucideIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  createMemberNotification,
  getMemberHubState,
  MemberHubState,
  updateFeatureSubmissionStatus,
} from '@/lib/member-hub-local'
import { cn } from '@/lib/utils'

export default function AdminMemberHubPage() {
  const [state, setState] = useState<MemberHubState | null>(null)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  function refresh() {
    setState(getMemberHubState())
  }

  useEffect(() => {
    refresh()
  }, [])

  const stats = useMemo(() => {
    const featureSubmissions = state?.featureSubmissions || []
    const notifications = state?.notifications || []

    return {
      members: state?.members.length || 0,
      pendingFeatures: featureSubmissions.filter((submission) => submission.status === 'pending').length,
      notifications: notifications.length,
    }
  }, [state])

  function handleNotificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const title = String(form.get('title') || '').trim()
    const message = String(form.get('message') || '').trim()
    const audience = String(form.get('audience') || 'all') as 'all' | 'approved'

    if (!title || !message) {
      setSaved(false)
      setError('Add a title and message before sending.')
      return
    }

    createMemberNotification({ title, message, audience })
    refresh()
    setError('')
    setSaved(true)
    event.currentTarget.reset()
    window.setTimeout(() => setSaved(false), 2400)
  }

  function handleFeatureStatus(id: string, status: 'pending' | 'reviewing' | 'approved' | 'published') {
    updateFeatureSubmissionStatus(id, status)
    refresh()
  }

  const notifications = state?.notifications || []
  const featureSubmissions = state?.featureSubmissions || []

  return (
    <div className="space-y-8 pt-20 lg:pt-0">
      <section className="rounded-[32px] bg-gradient-to-br from-orange-500 to-amber-500 p-7 text-white">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">Awardee dashboard controls</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Member Hub</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/80">
              Send dashboard notifications, review awardee feature requests, and keep member-facing updates in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatPill icon={Users} label="Members" value={stats.members} />
            <StatPill icon={Sparkles} label="Pending" value={stats.pendingFeatures} />
            <StatPill icon={Bell} label="Sent" value={stats.notifications} />
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card className="rounded-[28px] border-orange-100 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-zinc-950">
              <Bell className="h-6 w-6 text-orange-500" />
              Send notification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleNotificationSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className="font-bold text-zinc-900">Title</Label>
                <Input id="title" name="title" placeholder="Magazine deadline, new event, admin update..." className="h-12 rounded-2xl border-orange-100" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audience" className="font-bold text-zinc-900">Audience</Label>
                <select id="audience" name="audience" defaultValue="all" className="h-12 w-full rounded-2xl border border-orange-100 bg-white px-4 text-sm font-semibold text-zinc-900 outline-none">
                  <option value="all">All awardees</option>
                  <option value="approved">Approved awardees only</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="message" className="font-bold text-zinc-900">Message</Label>
                <Textarea id="message" name="message" placeholder="Write a short update awardees will see in their dashboard." className="min-h-36 rounded-3xl border-orange-100" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button className="rounded-full bg-orange-500 px-7 py-6 text-white hover:bg-orange-600">
                  Send to dashboard
                  <Send className="ml-2 h-4 w-4" />
                </Button>
                {saved ? <span className="text-sm font-bold text-zinc-900">Notification sent.</span> : null}
                {error ? <span className="text-sm font-bold text-orange-700">{error}</span> : null}
              </div>
            </form>
          </CardContent>
        </Card>

        <Card className="rounded-[28px] border-orange-100 shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl font-black text-zinc-950">
              <Sparkles className="h-6 w-6 text-orange-500" />
              Feature submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {featureSubmissions.length > 0 ? featureSubmissions.map((submission) => (
                <article key={submission.id} className="rounded-3xl border border-orange-100 bg-orange-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{submission.category}</p>
                      <h3 className="mt-2 text-xl font-black tracking-tight text-zinc-950">{submission.title}</h3>
                      <p className="mt-1 text-sm font-semibold text-zinc-500">{submission.memberName} · {submission.contactEmail}</p>
                    </div>
                    <span className={cn('rounded-full px-3 py-1 text-xs font-black capitalize', submission.status === 'published' ? 'bg-zinc-950 text-white' : 'bg-white text-orange-700')}>
                      {submission.status}
                    </span>
                  </div>
                  <p className="mt-3 text-sm font-medium leading-6 text-zinc-600">{submission.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['reviewing', 'approved', 'published'] as const).map((status) => (
                      <Button
                        key={status}
                        type="button"
                        variant="outline"
                        className="rounded-full border-orange-200 bg-white text-zinc-900 hover:bg-orange-100"
                        onClick={() => handleFeatureStatus(submission.id, status)}
                      >
                        Mark {status}
                      </Button>
                    ))}
                  </div>
                </article>
              )) : (
                <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 p-8 text-center">
                  <Clock className="mx-auto h-8 w-8 text-orange-500" />
                  <p className="mt-3 text-sm font-bold text-zinc-500">No member feature submissions yet.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[28px] border-orange-100 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-black text-zinc-950">
            <CheckCircle2 className="h-6 w-6 text-orange-500" />
            Recent dashboard notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            {notifications.length > 0 ? notifications.slice(0, 6).map((notification) => (
              <div key={notification.id} className="rounded-3xl border border-orange-100 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">{notification.audience}</p>
                <h3 className="mt-2 text-lg font-black tracking-tight text-zinc-950">{notification.title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-zinc-500">{notification.message}</p>
                <p className="mt-3 text-xs font-bold text-zinc-400">{formatAdminHubDate(notification.createdAt)}</p>
              </div>
            )) : (
              <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 p-8 text-center text-sm font-bold text-zinc-500">
                No dashboard notifications yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function StatPill({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/18 px-4 py-3 text-white backdrop-blur">
      <Icon className="h-5 w-5" />
      <p className="mt-2 text-2xl font-black leading-none">{value}</p>
      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/70">{label}</p>
    </div>
  )
}

function formatAdminHubDate(value: string) {
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}
