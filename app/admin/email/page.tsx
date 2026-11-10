'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { CalendarClock, Mail, RefreshCw, Send, ShieldCheck } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type Member = { id: string; name: string; email: string; years: number[]; suppressed: boolean; deliveryHeld?: boolean; emailable: boolean }
type Campaign = { id: string; subject: string; status: string; scheduledAt: string | null; createdAt: string; total: number; counts: Record<string, number> }
type Detail = { campaign: { subject: string; body: string; status: string }; recipients: Array<{ email: string; name: string; status: string; outcome: string | null }> }
type Preview = { count: number; matched: number; eligible: number; audienceKey: string; preview: { subject: string; html: string } | null }
type OutreachData = { members: Member[]; templates: Record<string, { subject: string; body: string }> }
const field = 'w-full min-h-11 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:outline-none focus:ring-2 focus:ring-amber-400'
const label = 'block space-y-1.5 text-sm font-medium text-zinc-800'
const statuses: Record<string, string> = { pending: 'Waiting', sending: 'Processing', accepted: 'Accepted by our mail server', delivered: 'Accepted by recipient server', bounced: 'Permanent failure', skipped: 'Skipped', failed: 'Failed', delivery_unknown: 'Needs review' }
function dateLabel(value: string | null) {
  if (!value) return 'Not scheduled'
  const date = new Date(value)
  return Number.isNaN(date.valueOf()) ? 'Time unavailable' : new Intl.DateTimeFormat('en-NG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Lagos' }).format(date) + ' WAT'
}
function nearFuture() { return new Date(Date.now() + 6 * 60_000).toISOString() }
async function call(path: string, init?: RequestInit) {
  const response = await fetch(path, { cache: 'no-store', ...init })
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(result.message || 'The request could not be completed.')
  return result
}

export default function AdminEmailPage() {
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [year, setYear] = useState(() => new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date()))
  const [segment, setSegment] = useState('all')
  const [template, setTemplate] = useState('general')
  const [limit, setLimit] = useState(100)
  const [time, setTime] = useState('')
  const [testMember, setTestMember] = useState('')
  const [directory, setDirectory] = useState<OutreachData | null>(null)
  const [history, setHistory] = useState<Campaign[] | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [preview, setPreview] = useState<Preview | null>(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const draft = { subject, body }
  const filter = { year, segment, search: '' }
  const resetPreview = () => setPreview(null)
  const loadHistory = useCallback(async () => {
    try { const result = await call('/api/admin/email'); setHistory(result.campaigns) }
    catch (err) { setHistory(null); setError(err instanceof Error ? err.message : 'Could not load email history.') }
  }, [])
  useEffect(() => {
    let active = true
    call('/api/admin/awards/outreach').then(data => { if (active) setDirectory(data) }).catch(() => { if (active) setError('Could not load the awardee directory.') })
    call('/api/admin/email').then(data => { if (active) setHistory(data.campaigns) }).catch(() => { if (active) setError('Could not load email history.') })
    return () => { active = false }
  }, [])
  async function post(data: unknown) {
    return call('/api/admin/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
  }
  async function run(action: string, work: () => Promise<void>) {
    setBusy(action); setError(''); setNotice('')
    try { await work() } catch (err) { setError(err instanceof Error ? err.message : 'The request could not be completed.') } finally { setBusy('') }
  }
  const cohortYears = [...new Set([Number(new Intl.DateTimeFormat('en', { year: 'numeric', timeZone: 'Africa/Lagos' }).format(new Date())), ...(directory?.members ?? []).flatMap(m => m.years ?? [])])].filter(Number.isFinite).sort((a, b) => b - a)
  const testOptions = (directory?.members ?? []).filter(m => m.emailable && !m.suppressed && !m.deliveryHeld && m.name && m.name !== 'Awardee')
  async function makePreview() {
    await run('preview', async () => {
      const result = await post({ action: 'preview', filter, template, limit, draft }) as Preview
      setPreview(result)
      if (!result.count) setNotice('No eligible contacts match these settings.')
    })
  }
  async function schedule(sendNow: boolean) {
    if (!preview?.count) return
    let sendAt: string
    if (sendNow) sendAt = nearFuture()
    else {
      const selected = new Date(`${time}:00+01:00`)
      if (!time || Number.isNaN(selected.valueOf())) { setError('Choose a valid Lagos date and time.'); return }
      sendAt = selected.toISOString()
    }
    if (!window.confirm(`Schedule this email for up to ${preview.count} recipients at ${dateLabel(sendAt)}?`)) return
    await run('schedule', async () => {
      const result = await post({ action: 'schedule', requestId: crypto.randomUUID(), audienceKey: preview.audienceKey, confirmed: true, filter, template, limit, draft, sendAt })
      setNotice(`${result.message} ${result.count} recipients prepared${result.blocked ? `; ${result.blocked} previously opted out` : ''}.`)
      setPreview(null); await loadHistory()
    })
  }
  async function sendTest() {
    const selected = testOptions.find(m => m.id === testMember)
    if (!selected || !window.confirm(`Send one test email to ${selected.email}?`)) return
    await run('test', async () => { const result = await post({ action: 'test', awardeeId: selected.id, template, draft }); setNotice(result.message) })
  }
  async function view(id: string) {
    await run('detail', async () => setDetail(await call(`/api/admin/email?id=${encodeURIComponent(id)}`)))
  }
  async function cancel(id: string) {
    if (!window.confirm('Stop this campaign? A message already being processed may still arrive.')) return
    await run('cancel', async () => { const result = await post({ action: 'cancel', campaignId: id }); setNotice(result.message); await loadHistory() })
  }
  function loadAwardDraft() {
    const saved = directory?.templates?.awareness
    if (!saved) { setError('The saved award email is unavailable.'); return }
    setSubject(saved.subject); setBody(saved.body); setYear('2026'); setSegment('not_started'); setTemplate('awareness'); resetPreview()
  }
  return <div className="space-y-6 pb-10">
    <PageHeader eyebrow="Member communications" title="Email campaigns" description="Write, preview and schedule messages, then follow their progress. Replies go to the configured Top100 inbox." />
    {error ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
    {notice ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{notice}</div> : null}
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.3fr)_minmax(300px,0.7fr)]">
      <section className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6" aria-labelledby="compose-heading">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Compose</p><h2 id="compose-heading" className="mt-1 text-xl font-semibold text-zinc-950">Create an email</h2><p className="mt-1 text-sm text-zinc-500">Personalise the message and review the audience before scheduling.</p></div><Button variant="outline" size="sm" onClick={loadAwardDraft} disabled={!!busy || !directory}>Use saved award email</Button></div>
        <label className={label}>Subject<Input value={subject} maxLength={160} onChange={e => { setSubject(e.target.value); resetPreview() }} placeholder="A clear subject for your message" /></label>
        <label className={label}>Message<textarea className={`${field} min-h-[250px] resize-y leading-6`} value={body} maxLength={6000} onChange={e => { setBody(e.target.value); resetPreview() }} placeholder="Hi {{first_name}}," /></label>
        <p className="text-xs leading-5 text-zinc-500">Use {'{{first_name}}'}, {'{{name}}'}, {'{{year}}'} and {'{{action_link}}'} to personalise. An unsubscribe link is added automatically.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className={label}>Email purpose<select className={field} value={template} onChange={e => { setTemplate(e.target.value); resetPreview() }}><option value="general">General awardee update</option><option value="awareness">Physical award introduction</option><option value="recovery">Unfinished award orders</option><option value="paid">Paid award follow-up</option><option value="verification">Payment verification</option><option value="follow_up">Award follow-up</option><option value="final">Final award check-in</option></select></label>
          <label className={label}>Cohort<select className={field} value={year} onChange={e => { setYear(e.target.value); resetPreview() }}>{cohortYears.map(value => <option key={value} value={String(value)}>{value}</option>)}<option value="all">All cohorts</option></select></label>
          <label className={label}>Audience<select className={field} value={segment} onChange={e => { setSegment(e.target.value); resetPreview() }}><option value="all">All matching awardees</option><option value="not_started">No award order</option><option value="recovery">Unfinished orders</option><option value="paid">Confirmed paid</option><option value="verification">Payment needs verification</option><option value="no_profile">No profile</option></select></label>
          <label className={label}>Maximum recipients<Input type="number" min={1} max={500} value={limit} onChange={e => { setLimit(Number(e.target.value)); resetPreview() }} /><span className="block text-xs font-normal text-zinc-500">Up to 500 per campaign.</span></label>
        </div>
        <div className="flex flex-wrap gap-3"><Button disabled={!!busy || !subject.trim() || !body.trim()} onClick={() => void makePreview()}><Mail className="mr-2 size-4" />{busy === 'preview' ? 'Preparing…' : 'Preview audience & email'}</Button></div>
        <div className="border-t border-zinc-100 pt-4"><label className={label}>Send a test to an awardee<select className={field} value={testMember} onChange={e => setTestMember(e.target.value)}><option value="">Choose a test recipient</option>{testOptions.map(m => <option key={m.id} value={m.id}>{m.name} — {m.email}</option>)}</select></label><Button className="mt-3" variant="outline" disabled={!!busy || !testMember || !subject.trim() || !body.trim()} onClick={() => void sendTest()}><Send className="mr-2 size-4" />{busy === 'test' ? 'Sending…' : 'Send test email'}</Button><p className="mt-2 text-xs text-zinc-500">Choose an existing, subscribed awardee so the test has a working personal unsubscribe link.</p></div>
      </section>
      <aside className="space-y-5">
        <section className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber-800" /><div><h2 className="font-semibold text-zinc-950">Respecting your audience</h2><p className="mt-1 text-sm leading-6 text-zinc-600">Unsubscribed and held contacts are excluded. Award payment status and coupon availability are checked again before each email.</p></div></div></section>
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5" aria-labelledby="preview-heading"><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Review</p><h2 id="preview-heading" className="mt-1 text-lg font-semibold text-zinc-950">Email preview</h2></div>{preview ? <><p className="text-sm text-zinc-600"><strong className="text-zinc-950">{preview.count}</strong> selected · {preview.eligible} eligible · {preview.matched} matched</p>{preview.preview ? <><p className="break-words text-sm font-medium">{preview.preview.subject}</p><iframe title="Personalised email preview" sandbox="" srcDoc={preview.preview.html} className="h-80 w-full rounded-lg border border-zinc-200 bg-white" /></> : null}<label className={label}>Schedule date and time (Lagos)<Input type="datetime-local" value={time} onChange={e => setTime(e.target.value)} /></label><div className="flex flex-wrap gap-2"><Button disabled={!!busy || !preview.count || !time} onClick={() => void schedule(false)}><CalendarClock className="mr-2 size-4" />{busy === 'schedule' ? 'Preparing…' : 'Schedule email'}</Button><Button variant="outline" disabled={!!busy || !preview.count} onClick={() => void schedule(true)}>Send in 6 minutes</Button></div><p className="text-xs leading-5 text-zinc-500">The short delay allows preparation and cancellation. Email and audience changes require a new preview.</p></> : <p className="text-sm leading-6 text-zinc-500">Your personalised preview and recipient count will appear here.</p>}</section>
      </aside>
    </div>
    <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6" aria-labelledby="history-heading"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Campaigns</p><h2 id="history-heading" className="mt-1 text-xl font-semibold text-zinc-950">Email history</h2></div><Button variant="outline" size="sm" disabled={!!busy} onClick={() => void loadHistory()}><RefreshCw className="mr-2 size-4" />Refresh</Button></div><p className="text-sm text-zinc-500">Acceptance by a recipient server does not confirm inbox placement or that the email was read. <Link href="/admin/awards" className="font-medium text-amber-800 underline">See earlier award outreach</Link>.</p>
      {history === null ? <p className="text-sm text-zinc-500">Email history is unavailable.</p> : history.length === 0 ? <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">No email campaigns yet.</p> : <div className="divide-y divide-zinc-100">{history.map(c => <article className="flex flex-wrap items-start justify-between gap-3 py-4" key={c.id}><div className="min-w-0"><h3 className="break-words font-medium text-zinc-950">{c.subject}</h3><p className="mt-1 text-sm text-zinc-500">{c.status} · {c.total} recipients · {dateLabel(c.scheduledAt)}</p><p className="mt-1 text-xs text-zinc-500">Recipient server accepted {c.counts.delivered ?? 0} · Mail server accepted {c.counts.accepted ?? 0} · Skipped {c.counts.skipped ?? 0} · Failed {(c.counts.bounced ?? 0) + (c.counts.failed ?? 0)} · Needs review {c.counts.delivery_unknown ?? 0}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={!!busy} onClick={() => void view(c.id)}>View details</Button>{['creating','armed','scheduled','running'].includes(c.status) ? <Button variant="outline" size="sm" disabled={!!busy} onClick={() => void cancel(c.id)}>Stop</Button> : null}</div></article>)}</div>}
      {detail ? <div className="space-y-3 rounded-xl border border-zinc-200 p-4"><div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{detail.campaign.subject}</h3><Button variant="ghost" size="sm" onClick={() => setDetail(null)}>Close</Button></div><p className="whitespace-pre-wrap break-words text-sm leading-6 text-zinc-600">{detail.campaign.body}</p><h4 className="font-medium">Recipient results</h4><div className="max-h-72 divide-y divide-zinc-100 overflow-auto">{detail.recipients.map((r, index) => <div className="py-2 text-sm" key={`${r.email}-${index}`}><p className="break-all font-medium">{r.name} · {r.email}</p><p className="text-xs text-zinc-500">{statuses[r.status] ?? r.status}{r.outcome ? ` — ${r.outcome}` : ''}</p></div>)}</div></div> : null}
    </section>
  </div>
}
