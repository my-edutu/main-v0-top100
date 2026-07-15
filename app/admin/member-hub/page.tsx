'use client'

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, CheckCircle2, Clock, Send, Sparkles, Users, XCircle, type LucideIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MemberProfile, MemberFeatureSubmission } from '@/lib/member-hub'
import { cn } from '@/lib/utils'

type AdminNotification = {
  id: string
  title: string
  message: string
  audience: string
  createdAt: string
  recipients: number
}

export default function AdminMemberHubPage() {
  const [members, setMembers] = useState<MemberProfile[]>([])
  const [featureSubmissions, setFeatureSubmissions] = useState<MemberFeatureSubmission[]>([])
  const [notifications, setNotifications] = useState<AdminNotification[]>([])
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [membersRes, featuresRes, notificationsRes] = await Promise.all([
        fetch('/api/admin/members', { cache: 'no-store' }),
        fetch('/api/admin/member-features', { cache: 'no-store' }),
        fetch('/api/admin/notifications/broadcast', { cache: 'no-store' }),
      ])
      if (membersRes.ok) setMembers((await membersRes.json()).members ?? [])
      if (featuresRes.ok) setFeatureSubmissions((await featuresRes.json()).featureSubmissions ?? [])
      if (notificationsRes.ok) setNotifications((await notificationsRes.json()).notifications ?? [])
      setError('')
    } catch {
      setError('Could not load the member hub.')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const pendingMembers = useMemo(() => members.filter((m) => m.status === 'pending'), [members])

  const stats = useMemo(
    () => ({
      members: members.length,
      pendingFeatures: featureSubmissions.filter((s) => s.status === 'pending').length,
      notifications: notifications.length,
    }),
    [members, featureSubmissions, notifications],
  )

  async function handleNotificationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formEl = event.currentTarget
    const form = new FormData(formEl)
    const title = String(form.get('title') || '').trim()
    const message = String(form.get('message') || '').trim()
    const audience = String(form.get('audience') || 'all') as 'all' | 'approved'

    if (!title || !message) {
      setSaved(false)
      setError('Add a title and message before sending.')
      return
    }

    setSending(true)
    try {
      const res = await fetch('/api/admin/notifications/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, audience }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Could not send the notification.')
      setError('')
      setSaved(true)
      toast.success(`Notification sent to ${data.recipients ?? 0} member${data.recipients === 1 ? '' : 's'}.`)
      formEl.reset()
      await refresh()
      window.setTimeout(() => setSaved(false), 2400)
    } catch (err) {
      setSaved(false)
      const msg = err instanceof Error ? err.message : 'Could not send the notification.'
      setError(msg)
      toast.error(msg)
    } finally {
      setSending(false)
    }
  }

  async function handleFeatureStatus(id: string, status: 'reviewing' | 'approved' | 'published') {
    try {
      const res = await fetch(`/api/admin/member-features/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Update failed.')
      await refresh()
      toast.success(`Marked as ${status}.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the submission.')
    }
  }

  async function handleMemberAction(id: string, action: 'approve' | 'reject' | 'suspend' | 'reset-bio') {
    try {
      const res = await fetch(`/api/admin/members/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({})))?.message || 'Update failed.')
      await refresh()
      toast.success(action === 'reset-bio' ? 'BIO limit reset.' : `Member ${action}d.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not update the member.')
    }
  }

  return (
    <div className="space-y-8 pt-20 lg:pt-0">
      <section className="rounded-[32px] bg-gradient-to-br from-orange-500 to-amber-500 p-7 text-white">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/70">Awardee dashboard controls</p>
            <h1 className="mt-3 text-4xl font-black tracking-tight">Member Hub</h1>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/80">
              Approve awardees, send dashboard notifications, and review feature requests in one place.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <StatPill icon={Users} label="Members" value={stats.members} />
            <StatPill icon={Sparkles} label="Pending" value={stats.pendingFeatures} />
            <StatPill icon={Bell} label="Sent" value={stats.notifications} />
          </div>
        </div>
      </section>

      <Card className="rounded-[28px] border-orange-100 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-black text-zinc-950">
            <Users className="h-6 w-6 text-orange-500" />
            Pending awardees
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingMembers.length > 0 ? (
            <div className="divide-y divide-orange-100">
              {pendingMembers.map((member) => (
                <div key={member.id} className="grid gap-4 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-sm font-black text-orange-700">
                      {member.avatarInitials}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-black text-zinc-950">{member.name}</h3>
                      <p className="text-sm text-zinc-500">{member.email}</p>
                      <p className="mt-1 text-sm font-medium text-zinc-700">{member.headline}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button className="rounded-full bg-orange-500 text-white hover:bg-orange-600" onClick={() => handleMemberAction(member.id, 'approve')}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve
                    </Button>
                    <Button variant="outline" className="rounded-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleMemberAction(member.id, 'reject')}>
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-orange-200 bg-orange-50/50 p-8 text-center text-sm font-bold text-zinc-500">
              No pending awardees.
            </div>
          )}
        </CardContent>
      </Card>

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
                <Button disabled={sending} className="rounded-full bg-orange-500 px-7 py-6 text-white hover:bg-orange-600">
                  {sending ? 'Sending...' : 'Send to dashboard'}
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
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-orange-600">
                  {notification.audience} · {notification.recipients} sent
                </p>
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

      <Card className="rounded-[28px] border-orange-100 shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl font-black text-zinc-950">
            <Users className="h-6 w-6 text-orange-500" />
            All members &amp; BIO limits
          </CardTitle>
        </CardHeader>
        <CardContent className="divide-y divide-orange-100 p-0">
          {members.length > 0 ? members.map((member) => {
            const remaining = Math.max(0, member.bioUpdateLimit - member.bioUpdateCount)
            return (
              <div key={member.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-black text-zinc-950">{member.name}</h3>
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.16em]',
                      member.status === 'approved' ? 'bg-emerald-50 text-emerald-700'
                        : member.status === 'pending' ? 'bg-amber-50 text-amber-700'
                        : 'bg-slate-100 text-slate-500',
                    )}>
                      {member.status}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">{member.email}</p>
                  <p className="mt-1 text-sm font-medium text-zinc-700">{remaining} of {member.bioUpdateLimit} BIO updates remaining</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" className="rounded-full border-orange-200 text-orange-700 hover:bg-orange-50" onClick={() => handleMemberAction(member.id, 'reset-bio')}>
                    Reset BIO limit
                  </Button>
                  {member.status !== 'suspended' ? (
                    <Button variant="outline" className="rounded-full border-red-200 text-red-700 hover:bg-red-50" onClick={() => handleMemberAction(member.id, 'suspend')}>
                      Suspend
                    </Button>
                  ) : (
                    <Button variant="outline" className="rounded-full border-emerald-200 text-emerald-700 hover:bg-emerald-50" onClick={() => handleMemberAction(member.id, 'approve')}>
                      Reinstate
                    </Button>
                  )}
                </div>
              </div>
            )
          }) : (
            <div className="p-5 text-sm font-medium text-zinc-500">No members yet.</div>
          )}
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
