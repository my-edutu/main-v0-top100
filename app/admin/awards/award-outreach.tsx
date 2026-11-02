'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Check, Copy, Download, Mail, RefreshCw, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { OUTREACH_REASONS, OUTREACH_SEGMENTS, filterOutreachAudience, type OutreachMember, type OutreachSegment } from '@/lib/awards/outreach'
import { OUTREACH_TEMPLATES, defaultOutreachDraft, templateEligible, type OutreachDraft, type OutreachTemplate } from '@/lib/awards/outreach-templates'
import styles from './award-outreach.module.css'

type DeliveryIssue = { id: string; name: string; email: string; status: string; outcome: string | null }
type Campaign = { id: string; template: OutreachTemplate; created_at: string; cancelled_at: string | null; total: number; counts: Record<string, number>; paidAfterSend: number | null; issues?: DeliveryIssue[] }
export type OutreachSnapshot = { members: OutreachMember[]; setup: boolean; message: string | null; templates: Record<OutreachTemplate, OutreachDraft>; campaigns: Campaign[]; deliveryReviews?: DeliveryIssue[] }
const endpoint = '/api/admin/awards/outreach'
export function useAwardOutreach() {
  const [data, setData] = useState<OutreachSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [year, setYear] = useState('2026')
  const [segment, setSegment] = useState<OutreachSegment>('recovery')
  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await fetch(endpoint, { cache: 'no-store' })
      const body = await response.json()
      if (!response.ok || !Array.isArray(body.members)) throw new Error(body.message || 'Could not load eligible awardees.')
      setData(body)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not load awardee outreach.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { const timer = window.setTimeout(() => { void load() }, 0); return () => window.clearTimeout(timer) }, [load])
  const selectSegment = (next: OutreachSegment) => {
    setSegment(next)
    document.getElementById('award-outreach-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return { data, loading, error, year, setYear, segment, setSegment, selectSegment, load }
}
type Controller = ReturnType<typeof useAwardOutreach>
export function AwardOutreachMetrics({ controller: c }: { controller: Controller }) {
  const rows = c.data?.members ?? []
  const unavailable = !c.data || !!c.error || c.loading
  const total = filterOutreachAudience(rows, { year: c.year, segment: 'all' }).length
  return <>{([
    ['unpaid', 'Unpaid', `of ${total} eligible awardees · no confirmed payment`],
    ['no_profile', 'No profile', 'Eligible, unpaid and no linked account'],
    ['not_started', 'No award order', 'Eligible, unpaid and no order started'],
    ['not_clicked', 'No recorded link visit', 'Only members issued a tracked link'],
  ] as const).map(([key, label, hint]) => <button key={key} type="button" className="award-metric" disabled={unavailable} aria-pressed={c.segment === key} onClick={() => c.selectSegment(key)}>
    <span><Users aria-hidden="true" /></span><div><strong>{unavailable ? '—' : filterOutreachAudience(rows, { year: c.year, segment: key }).length}</strong><p>{label} · {c.year === 'all' ? 'all cohorts' : c.year}</p><small>{hint}</small></div>
  </button>)}</>
}
const suggestedTemplate = (segment: OutreachSegment): OutreachTemplate => segment === 'paid' ? 'paid' : segment === 'verification' ? 'verification' : ['no_profile', 'not_started'].includes(segment) ? 'awareness' : segment === 'follow_up' ? 'follow_up' : 'recovery'
const dateLabel = (value: string | null) => value ? new Date(value).toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos' }) : 'Not recorded'
const stateLabel = (member: OutreachMember) => ({ paid: 'Confirmed paid', verification: 'Verify payment first', recovery: 'Unfinished order', not_started: 'No order started' })[member.state]
async function post(value: unknown) {
  const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) })
  if (!response.ok) { const error = await response.json().catch(() => ({})); throw new Error(error.message || 'The outreach action could not be completed.') }
  return response
}
export function AwardOutreachWorkspace({ controller: c }: { controller: Controller }) {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [templateOverride, setTemplate] = useState<{ segment: OutreachSegment; template: OutreachTemplate } | null>(null)
  const template = templateOverride?.segment === c.segment ? templateOverride.template : suggestedTemplate(c.segment)
  const [edited, setEdited] = useState<{ template: OutreachTemplate; draft: OutreachDraft } | null>(null)
  const draft = edited?.template === template ? edited.draft : c.data?.templates[template] ?? defaultOutreachDraft(template)
  const [limit, setLimit] = useState(50)
  const [busy, setBusy] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [preview, setPreview] = useState<{ signature: string; audienceKey: string; count: number; excluded: number; preview: { subject: string; html: string; text: string } | null } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const requestId = useRef<{ signature: string; id: string } | null>(null)
  const filter = useMemo(() => ({ year: c.year, segment: c.segment, search }), [c.year, c.segment, search])
  const members = useMemo(() => filterOutreachAudience(c.data?.members ?? [], filter), [c.data, filter])
  const eligible = members.filter(m => templateEligible(m, template))
  const signature = JSON.stringify({ filter, template, draft, limit })
  const activePreview = preview?.signature === signature ? preview : null
  const disabled = !!busy || c.loading || !!c.error || !c.data?.setup
  const years = [...new Set([2023, 2026, ...(c.data?.members.flatMap(m => m.years) ?? [])])].sort((a, b) => b - a)
  const pages = Math.max(1, Math.ceil(members.length / 30))
  const currentPage = Math.min(page, pages - 1)
  const noteMember = c.data?.members.find(m => m.id === selected)
  const run = async (name: string, action: () => Promise<void>) => {
    setBusy(name)
    try { await action() } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Could not complete this action.') }
    finally { setBusy('') }
  }
  const exportMembers = (format: 'csv' | 'emails') => run(format, async () => {
    const response = await post({ action: 'export', filter, template, draft, limit, format })
    const content = await response.text()
    if (format === 'emails') { await navigator.clipboard.writeText(content); toast.success('Eligible email addresses copied.') }
    else {
      const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a'); link.href = url; link.download = `award-outreach-${c.year}-${c.segment}.csv`; link.click(); URL.revokeObjectURL(url)
      toast.success('SMTP mail-merge CSV downloaded.')
    }
    await c.load()
  })
  return <section className={styles.workspace} aria-labelledby="award-outreach-heading">
    <div className="award-section-heading"><div><p className="admin-kicker">Member outreach</p><h2 id="award-outreach-heading" className={styles.heading}>Recover payments. Reach eligible members.</h2></div><Button variant="outline" disabled={c.loading} onClick={() => void c.load()}><RefreshCw className={`mr-2 h-4 w-4 ${c.loading ? 'animate-spin' : ''}`} aria-hidden="true" />Refresh audience</Button></div>
    <p className={styles.help}>Counts come from eligible awardees, including those without accounts. Each person appears once across orders. “Unpaid” means no verified payment; it includes cases needing verification.</p>
    {c.error ? <p role="alert" className={styles.alert}>{c.error} Previous results may be stale. Refresh before contacting members.</p> : null}
    {c.data?.message ? <p role="status" className={styles.alert}>{c.data.message}</p> : null}
    {c.loading && !c.data ? <p role="status">Loading eligible awardees and payment evidence…</p> : null}
    <div className={styles.filters}>
      <label>Cohort<select value={c.year} onChange={e => { c.setYear(e.target.value); setPage(0) }}><option value="all">All cohorts · 2023 onward</option>{years.map(y => <option key={y} value={y}>{y}</option>)}</select></label>
      <label>Member group<select value={c.segment} onChange={e => { c.setSegment(e.target.value as OutreachSegment); setPage(0) }}>{Object.entries(OUTREACH_SEGMENTS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label>Search<Input placeholder="Name, email, country or owner" value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} /></label>
    </div>
    <p className={styles.help}><strong>{members.length}</strong> unique awardees in this group · <strong>{eligible.length}</strong> eligible for the selected message. Missing emails, opt-outs, delivery holds, recent contacts, confirmed payments and verification cases are excluded as appropriate. Historical link visits are unknown; recorded visits can include email security scanners.</p>
    <div className={styles.columns}>
      <div className={styles.panel}>
        <div className={styles.panelHeader}><h3>Contact worklist</h3><span>{members.length} people</span></div>
        {members.length === 0 ? <p className={styles.empty}>{c.error ? 'Audience unavailable.' : 'No eligible awardees match this group. Try a different cohort or filter.'}</p> : <ul className={styles.members}>{members.slice(currentPage * 30, (currentPage + 1) * 30).map(member => <li key={member.id}>
          <div><strong>{member.name}</strong><a href={`mailto:${member.emailable ? member.email : ''}`}>{member.email || 'No email on file'}</a><span>{member.years.join(' / ')} · {member.country || 'Country not recorded'}</span></div>
          <div className={styles.memberMeta}><span className={member.state === 'paid' ? styles.success : member.state === 'verification' ? styles.warning : ''}>{stateLabel(member)}</span><span>{member.profileId ? 'Profile created' : 'No profile'} · {member.visit === 'unknown' ? 'Visits unknown' : member.visit === 'clicked' ? 'Link visited' : 'No recorded visit'}</span><span>{member.suppressed ? 'Outreach stopped' : member.deliveryHeld ? 'Email delivery awaiting review' : member.owner ? `Owner: ${member.owner}` : 'Unassigned'} · Contacted: {dateLabel(member.lastContactedAt)}</span>{member.nextFollowUpAt ? <span>Follow up: {dateLabel(member.nextFollowUpAt)}</span> : null}<Button variant="outline" disabled={disabled} onClick={() => setSelected(member.id)}>Notes & follow-up</Button></div>
        </li>)}</ul>}
        {pages > 1 ? <div className={styles.actions}><Button variant="outline" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</Button><span>Page {currentPage + 1} of {pages}</span><Button variant="outline" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}>Next</Button></div> : null}
      </div>
      <div className={styles.panel}>
        <div className={styles.panelHeader}><h3>Message this group</h3><Mail className="h-4 w-4" aria-hidden="true" /></div>
        <div className={styles.editor}>
          <label>Reusable template<select value={template} onChange={e => { setTemplate({ segment: c.segment, template: e.target.value as OutreachTemplate }); setEdited(null); setConfirmed(false) }}>{Object.entries(OUTREACH_TEMPLATES).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></label>
          <label>Subject<Input maxLength={160} value={draft.subject} onChange={e => setEdited({ template, draft: { ...draft, subject: e.target.value } })} /></label>
          <label>Message<Textarea rows={11} maxLength={6000} value={draft.body} onChange={e => setEdited({ template, draft: { ...draft, body: e.target.value } })} /></label>
          <p className={styles.help}>Merge fields: {'{{name}}'}, {'{{first_name}}'}, {'{{year}}'}, {'{{fee}}'}, {'{{action_link}}'}. Fees, award photo, tracked links and the stop-outreach link are added to the branded email.</p>
          <div className={styles.actions}><Button variant="outline" disabled={disabled} onClick={() => void run('save', async () => { await post({ action: 'save_template', template, draft }); toast.success('Reusable template saved.'); await c.load() })}>Save template</Button><Button variant="ghost" onClick={() => { setEdited({ template, draft: defaultOutreachDraft(template) }); setConfirmed(false) }}>Use suggested wording</Button></div>
          <label>Pilot size<select value={limit} onChange={e => { setLimit(Number(e.target.value)); setConfirmed(false) }}>{[25, 50, 100, 250, 500].map(n => <option key={n} value={n}>Up to {n} eligible contacts</option>)}</select></label>
          <div className={styles.actions}><Button variant="outline" disabled={disabled || eligible.length === 0} onClick={() => void exportMembers('csv')}><Download className="mr-2 h-4 w-4" aria-hidden="true" />SMTP mail-merge CSV</Button><Button variant="outline" disabled={disabled || eligible.length === 0} onClick={() => void exportMembers('emails')}><Copy className="mr-2 h-4 w-4" aria-hidden="true" />Copy emails</Button></div>
          <p className={styles.help}>CSV includes contact data, personalized subject and message, and each person’s tracked link. Exporting prepares links; it does not mean the person was contacted. Record external sends in their follow-up notes.</p>
          <Button disabled={disabled || eligible.length === 0} onClick={() => void run('preview', async () => { const result = await (await post({ action: 'preview', filter, template, draft, limit })).json(); setPreview({ ...result, signature }); setConfirmed(false) })}>Review recipients & email</Button>
          {activePreview ? <div className={styles.preview}>
            <p><strong>{activePreview.count}</strong> recipients in this batch · {activePreview.excluded} excluded from this group.</p>
            {activePreview.preview ? <><iframe title="Branded outreach email preview" sandbox="" srcDoc={activePreview.preview.html} /><details><summary>Plain-text version</summary><pre>{activePreview.preview.text}</pre></details></> : <p>No recipients are eligible for this template.</p>}
            <label className={styles.checkbox}><input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} />I reviewed this message and the {activePreview.count} recipients and want to queue this batch.</label>
            <Button disabled={disabled || !confirmed || activePreview.count === 0} onClick={() => void run('queue', async () => {
              const requestSignature = `${signature}:${activePreview.audienceKey}`
              if (requestId.current?.signature !== requestSignature) requestId.current = { signature: requestSignature, id: crypto.randomUUID() }
              const body = await (await post({ action: 'campaign', filter, template, draft, limit, requestId: requestId.current.id, confirmed: true, audienceKey: activePreview.audienceKey })).json()
              toast.success(body.message); setConfirmed(false); setPreview(null); requestId.current = null; await c.load()
            })}><Mail className="mr-2 h-4 w-4" aria-hidden="true" />{busy === 'queue' ? 'Queuing…' : `Queue ${activePreview.count} emails`}</Button>
          </div> : null}
          <p className={styles.help}>Queuing requires the SMTP worker schedule. It processes three messages at a time, rechecks eligibility, and holds uncertain delivery for review. Recent contacts are skipped for three days.</p>
        </div>
      </div>
    </div>
    {noteMember ? <NoteEditor key={noteMember.id} member={noteMember} disabled={disabled} onClose={() => setSelected(null)} onSaved={async () => { await c.load(); setSelected(null) }} /> : null}
    <details className={styles.panel}><summary>Suggested first 14 days</summary><ol className={styles.playbook}><li>Reconcile payment questions and speak with 10 unfinished-order members and 10 people who have not started. Record their obstacles in Notes & follow-up.</li><li>Start with 50 recovery contacts and 100 awareness contacts. Assign an owner who can answer replies and confirm fulfillment arrangements.</li><li>Use the helpful follow-up around day four and the final check-in around day eight. The follow-up due group shows saved dates; these messages are queued only when you review them.</li><li>Compare confirmed payments per recipient for each group before expanding. Investigate price, timing and delivery objections before changing the offer.</li></ol></details>
    {c.data?.deliveryReviews?.length ? <section className={styles.panel} aria-label="Email delivery review"><h3>Email delivery awaiting verification</h3><p className={styles.help}>These contacts are held out of all new email batches and exports. Check the provider before saving a result. Up to 20 outstanding cases are shown, including older campaigns.</p>{c.data.deliveryReviews.map(issue => <DeliveryIssueReview key={issue.id} issue={issue} disabled={disabled} onSaved={c.load} />)}</section> : null}
    <div className={styles.panel}><div className={styles.panelHeader}><h3>Recent campaigns</h3><span>Refresh to update</span></div><p className={styles.help}>“Accepted” means SMTP accepted the email. “Paid after send” is observed payment status, not proof the message caused payment.</p>
      {!c.data?.campaigns.length ? <p className={styles.empty}>No outreach campaigns have been queued.</p> : c.data.campaigns.map(campaign => <article key={campaign.id} className={styles.campaign}><div><strong>{OUTREACH_TEMPLATES[campaign.template]}</strong><span>{dateLabel(campaign.created_at)} · {campaign.total} recipients{campaign.cancelled_at ? ' · Stopped' : ''}</span><span>Accepted {campaign.counts.sent ?? 0} · Pending {(campaign.counts.pending ?? 0) + (campaign.counts.processing ?? 0)} · Skipped {campaign.counts.skipped ?? 0} · Failed {campaign.counts.failed ?? 0} · Delivery uncertain {campaign.counts.delivery_unknown ?? 0}{campaign.paidAfterSend !== null ? ` · Paid after send ${campaign.paidAfterSend}` : ''}</span></div>{!campaign.cancelled_at && campaign.counts.pending ? <Button variant="outline" disabled={disabled} onClick={() => void run('cancel', async () => { await post({ action: 'cancel', campaignId: campaign.id }); toast.success('Pending campaign messages stopped.'); await c.load() })}>Stop pending</Button> : null}
        {campaign.issues?.length ? <details className={styles.issueList}><summary>Review delivery issues · up to 20 shown</summary>{campaign.issues.map(issue => <DeliveryIssueReview key={issue.id} issue={issue} disabled={disabled} onSaved={c.load} />)}</details> : null}
      </article>)}
    </div>
  </section>
}
function DeliveryIssueReview({ issue, disabled, onSaved }: { issue: DeliveryIssue; disabled: boolean; onSaved: () => Promise<void> }) {
  const [note, setNote] = useState(''), [outcome, setOutcome] = useState<'accepted' | 'not_sent'>('not_sent'), [saving, setSaving] = useState(false), [error, setError] = useState('')
  return <div className={styles.issue}><p><strong>{issue.name}</strong> · {issue.email}</p><p className={styles.help}>{issue.outcome || 'Check the SMTP provider logs before taking action.'}</p>{issue.status === 'delivery_unknown' ? <form className={styles.editor} onSubmit={async e => {
    e.preventDefault(); setSaving(true); setError('')
    try { await post({ action: 'resolve_delivery', recipientId: issue.id, outcome, reviewNote: note, confirmed: true }); toast.success('Delivery review saved. No message was resent.'); await onSaved() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save delivery review.') }
    finally { setSaving(false) }
  }}><label>Verified provider result<select value={outcome} onChange={e => setOutcome(e.target.value as typeof outcome)}><option value="not_sent">Provider confirms the message was not accepted</option><option value="accepted">Provider confirms the message was accepted</option></select></label><label>Provider evidence or support reference<Input required minLength={10} maxLength={500} value={note} onChange={e => setNote(e.target.value)} /></label><p className={styles.help}>Save only after checking the provider logs. This updates delivery tracking and never retries the message.</p>{error ? <p role="alert">{error}</p> : null}<Button type="submit" variant="outline" disabled={disabled || saving || note.trim().length < 10}>Save verified delivery result</Button></form> : null}</div>
}
function NoteEditor({ member, disabled, onClose, onSaved }: { member: OutreachMember; disabled: boolean; onClose: () => void; onSaved: () => Promise<void> }) {
  const [owner, setOwner] = useState(member.owner), [notes, setNotes] = useState(member.notes), [reason, setReason] = useState(member.reason), [suppressed, setSuppressed] = useState(member.suppressed)
  const [last, setLast] = useState(member.lastContactedAt?.slice(0, 10) ?? ''), [next, setNext] = useState(member.nextFollowUpAt?.slice(0, 10) ?? '')
  const [saving, setSaving] = useState(false), [error, setError] = useState('')
  return <Dialog open onOpenChange={open => { if (!open && !saving) onClose() }}><DialogContent className={`${styles.workspace} ${styles.note}`} onEscapeKeyDown={e => { if (saving) e.preventDefault() }} onInteractOutside={e => { if (saving) e.preventDefault() }}><DialogTitle>Follow-up for {member.name}</DialogTitle><DialogDescription>Record the conversation, obstacle and next action. Dates use West Africa Time.</DialogDescription><form onSubmit={async e => {
    e.preventDefault(); setSaving(true); setError('')
    try {
      const response = await fetch(endpoint, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ awardeeId: member.id, owner, notes, reason, suppressed, lastContactedAt: last ? new Date(`${last}T12:00:00+01:00`).toISOString() : null, nextFollowUpAt: next ? new Date(`${next}T09:00:00+01:00`).toISOString() : null }) })
      if (!response.ok) { const body = await response.json(); throw new Error(body.message || 'Could not save follow-up.') }
      toast.success('Follow-up saved.'); await onSaved()
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not save follow-up.') }
    finally { setSaving(false) }
  }}><div className={styles.panelHeader}><h3>{member.name}</h3><Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Close</Button></div><div className={styles.editor}>
    <label>Assigned owner<Input value={owner} maxLength={120} onChange={e => setOwner(e.target.value)} /></label><label>Main obstacle<select value={reason} onChange={e => setReason(e.target.value as typeof reason)}>{OUTREACH_REASONS.map(r => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}</select></label>
    <div className={styles.filters}><label>Last contacted · WAT<Input type="date" value={last} onChange={e => setLast(e.target.value)} /></label><label>Next follow-up · WAT<Input type="date" value={next} onChange={e => setNext(e.target.value)} /></label></div>
    <label>Conversation notes<Textarea rows={5} maxLength={3000} value={notes} onChange={e => setNotes(e.target.value)} /></label><label className={styles.checkbox}><input type="checkbox" checked={suppressed} onChange={e => setSuppressed(e.target.checked)} />Stop award outreach for this person</label><p className={styles.help}>“Already paid” moves an unpaid member into verification. It never marks a payment confirmed.</p>{error ? <p role="alert" className={styles.alert}>{error}</p> : null}<Button type="submit" disabled={disabled || saving}><Check className="mr-2 h-4 w-4" aria-hidden="true" />{saving ? 'Saving…' : 'Save follow-up'}</Button>
  </div></form></DialogContent></Dialog>
}
