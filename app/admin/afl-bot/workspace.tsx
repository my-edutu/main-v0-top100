'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { BookOpen, FileText, Megaphone, RefreshCw, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Announcement, AnnouncementPreview, BotStatus, KnowledgeEntry } from '@/lib/afl-bot/types'
import { changeBot, loadBot, pdfBase64 } from './bot-client'

const panel = 'rounded-xl border border-zinc-200 bg-white p-4 sm:p-6'
const field = 'space-y-1.5 text-sm'
const control = 'min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm'
const emptyKnowledge = { title: '', content: '', audience: 'admin_only', source_url: '', effective_at: '', expires_at: '', replaces: '' }
const errorText = (error: unknown) => error instanceof Error ? error.message : 'The operation failed. Please try again.'
function stamp(value: string | number | null | undefined) {
  if (!value) return '—'
  const date = new Date(typeof value === 'number' ? value * 1000 : value)
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString('en-GB', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' })
}
function audience(value: string) { return value === 'members' ? 'Members after publication' : 'Admins only' }
const delivery = { draft: 'Draft · not sent', sending: 'Sending · verify delivery', sent: 'Sent to WhatsApp', unconfirmed: 'Delivery unconfirmed · check group' }

async function readWorkspace(knowledgePage = 1, announcementPage = 1) {
  const status = await loadBot<BotStatus>('status')
  const [knowledge, announcements] = await Promise.all([
    status.knowledge_enabled ? loadBot<{ items: KnowledgeEntry[] }>('knowledge', undefined, knowledgePage)
      : Promise.resolve({ items: [] as KnowledgeEntry[] }),
    loadBot<{ items: Announcement[] }>('announcements', undefined, announcementPage),
  ])
  return { status, knowledge: knowledge.items, announcements: announcements.items }
}

export function BotWorkspace() {
  const [status, setStatus] = useState<BotStatus | null>(null)
  const [knowledge, setKnowledge] = useState<KnowledgeEntry[]>([])
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [selected, setSelected] = useState<KnowledgeEntry | null>(null)
  const [announcement, setAnnouncement] = useState<Announcement | null>(null)
  const [preview, setPreview] = useState<AnnouncementPreview | null>(null)
  const [reviewed, setReviewed] = useState(false)
  const [previewExpired, setPreviewExpired] = useState(false)
  const [publishReview, setPublishReview] = useState(false)
  const [retireReview, setRetireReview] = useState(false)
  const [publishChecked, setPublishChecked] = useState(false)
  const [draftAudience, setDraftAudience] = useState('admin_only')
  const [form, setForm] = useState(emptyKnowledge)
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const knowledgeKey = useRef<{ fingerprint: string; id: string } | null>(null)
  const announcementKey = useRef<{ fingerprint: string; id: string } | null>(null)
  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' })
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [knowledgePage, setKnowledgePage] = useState(1)
  const [announcementPage, setAnnouncementPage] = useState(1)

  async function refresh() {
    setLoading(true); setError(''); setPreview(null); setReviewed(false)
    setPublishReview(false); setPublishChecked(false); setRetireReview(false)
    try {
      const next = await readWorkspace(knowledgePage, announcementPage)
      setStatus(next.status); setKnowledge(next.knowledge); setAnnouncements(next.announcements)
      if (selected) setSelected(await loadBot<KnowledgeEntry>('knowledge', selected.id))
      if (announcement) setAnnouncement(await loadBot<Announcement>('announcements', announcement.id))
    } catch (err) { setError(errorText(err)) } finally { setLoading(false) }
  }
  // Read-only initial load. No mutation is triggered from an effect.
  useEffect(() => {
    let active = true
    void readWorkspace().then(next => {
      if (active) { setStatus(next.status); setKnowledge(next.knowledge); setAnnouncements(next.announcements) }
    }).catch(err => { if (active) setError(errorText(err)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])
  useEffect(() => {
    if (!preview) return
    const timer = window.setTimeout(() => setPreviewExpired(true), Math.max(0, preview.preview_expires_at * 1000 - Date.now()))
    return () => window.clearTimeout(timer)
  }, [preview])

  async function run(task: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await task() } catch (err) { setError(errorText(err)) } finally { setBusy(false) }
  }
  function requestId(ref: typeof knowledgeKey, fingerprint: string) {
    if (!ref.current || ref.current.fingerprint !== fingerprint) ref.current = { fingerprint, id: crypto.randomUUID() }
    return ref.current.id
  }
  async function reloadKnowledge() {
    setKnowledge((await loadBot<{ items: KnowledgeEntry[] }>('knowledge', undefined, knowledgePage)).items)
  }
  async function reloadAnnouncements() {
    setAnnouncements((await loadBot<{ items: Announcement[] }>('announcements', undefined, announcementPage)).items)
  }
  async function selectKnowledge(item: KnowledgeEntry) {
    await run(async () => {
      const detail = await loadBot<KnowledgeEntry>('knowledge', item.id)
      setSelected(detail); setDraftAudience(detail.audience); setPublishReview(false); setRetireReview(false); setPublishChecked(false)
    })
  }
  function saveKnowledge(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const encoded = file ? await pdfBase64(file) : undefined
      const payload = { ...form, ...(encoded ? { pdf_base64: encoded, filename: file?.name } : {}) }
      const entry = await changeBot<KnowledgeEntry>('createKnowledge', { ...payload,
        request_id: requestId(knowledgeKey, JSON.stringify(payload)) })
      setSelected(entry); setDraftAudience(entry.audience); setPublishReview(false); setRetireReview(false); setPublishChecked(false)
      setForm(emptyKnowledge); setFile(null); if (fileInput.current) fileInput.current.value = ''
      await reloadKnowledge(); setNotice('Knowledge draft saved. Review its audience and content before publishing.')
    })
  }
  async function knowledgeAction(action: string, data: Record<string, unknown> = {}) {
    if (!selected) return
    await run(async () => {
      const entry = await changeBot<KnowledgeEntry>(action, data, selected.id)
      setSelected(await loadBot<KnowledgeEntry>('knowledge', entry.id)); setPublishReview(false); setRetireReview(false); setPublishChecked(false)
      await reloadKnowledge(); setNotice(action === 'publishKnowledge' ? 'This version is published. Only eligible member knowledge can support member answers.'
        : action === 'retireKnowledge' ? 'Entry retired. It no longer supports answers or document downloads.' : 'Draft audience updated.')
    })
  }
  function saveAnnouncement(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      const entry = await changeBot<Announcement>('createAnnouncement', { ...announcementForm,
        request_id: requestId(announcementKey, JSON.stringify(announcementForm)) })
      setAnnouncement(entry); setPreview(null); setReviewed(false); setAnnouncementForm({ title: '', content: '' })
      await reloadAnnouncements(); setNotice('Announcement draft saved. Nothing has been sent.')
    })
  }
  async function announcementPreview() {
    if (!announcement) return
    await run(async () => {
      setPreviewExpired(false); setReviewed(false)
      setPreview(await changeBot<AnnouncementPreview>('previewAnnouncement', {}, announcement.id))
    })
  }
  async function sendAnnouncement() {
    if (!announcement || !preview || !reviewed) return
    if (Date.now() >= preview.preview_expires_at * 1000) {
      setPreviewExpired(true); setError('This preview expired. Preview the announcement again before sending.'); return
    }
    const confirmed = preview
    setPreview(null); setReviewed(false)
    await run(async () => {
      try {
        const sent = await changeBot<Announcement>('sendAnnouncement', { preview_token: confirmed.preview_token, confirmation: 'SEND' }, announcement.id)
        setAnnouncement(sent); setNotice('Announcement sent to the test group.')
      } catch (err) {
        // A timeout may happen after WhatsApp accepts the message. Read status; never retry a send automatically.
        try { setAnnouncement(await loadBot<Announcement>('announcements', announcement.id)) } catch { /* preserve send error */ }
        throw err
      } finally { await reloadAnnouncements().catch(() => undefined) }
    })
  }
  async function pageList(kind: 'knowledge' | 'announcements', page: number) {
    await run(async () => {
      if (kind === 'knowledge') {
        setKnowledge((await loadBot<{ items: KnowledgeEntry[] }>(kind, undefined, page)).items); setKnowledgePage(page)
      } else {
        setAnnouncements((await loadBot<{ items: Announcement[] }>(kind, undefined, page)).items); setAnnouncementPage(page)
      }
    })
  }
  const disabled = busy || loading || !status

  return <div className="space-y-5">
    <section className={`${panel} flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between`} aria-label="Bot connection status">
      <div className="min-w-0">
        <p className="font-medium text-zinc-950">{loading ? 'Checking bot connection…' : !status ? 'Bot connection unavailable' : status.connected ? 'WhatsApp connected' : 'Bot reachable · WhatsApp disconnected'}</p>
        <p className="mt-1 text-sm leading-6 text-zinc-500">{status ? `Knowledge ${status.knowledge_enabled ? 'enabled' : 'disabled'} · Reply model ${status.groq_enabled ? 'ready' : 'unavailable'} · Conversation memory ${status.memory_enabled ? 'ready' : 'off'}`
          : 'Connect the private bot service to manage its knowledge and announcements here.'}</p>
        {status && <p className="text-xs leading-6 text-zinc-500">{status.test_group_configured ? 'Sending is restricted to the configured test group.' : 'Set a test group before sending announcements.'}</p>}
      </div>
      <Button variant="outline" disabled={busy || loading} onClick={() => void refresh()}><RefreshCw className="mr-2 size-4" />Refresh status</Button>
    </section>
    {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">{error}</div>}
    {notice && <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">{notice}</p>}
    <Tabs defaultValue="knowledge">
      <TabsList className="mb-5 h-auto w-full justify-start gap-1 bg-zinc-100 p-1 sm:w-auto">
        <TabsTrigger value="knowledge" className="min-h-11 flex-1 gap-2"><BookOpen className="size-4" />Knowledge library</TabsTrigger>
        <TabsTrigger value="announcements" className="min-h-11 flex-1 gap-2"><Megaphone className="size-4" />Announcements</TabsTrigger>
      </TabsList>
      <TabsContent value="knowledge" className="space-y-5">
        <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <form className={`${panel} space-y-4`} onSubmit={saveKnowledge}>
            <div><h2 className="text-lg font-medium">Add knowledge</h2><p className="mt-1 text-sm leading-6 text-zinc-500">Add a guide, FAQ, directions or announcement details as a draft. Only published member entries can answer member questions.</p></div>
            <label className={`${field} block`}>Title<Input required maxLength={200} value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Mentoring registration guide" /></label>
            <label className={`${field} block`}>Knowledge text<Textarea rows={7} maxLength={80000} value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} placeholder="Write complete, accurate guidance, including any conditions and relevant links." /></label>
            <label className={`${field} block`}>PDF document <span className="text-zinc-500">(optional)</span><Input ref={fileInput} type="file" accept="application/pdf,.pdf" onChange={e => setFile(e.target.files?.[0] || null)} /><span className="block text-xs leading-5 text-zinc-500">Readable text, up to 10 MB. Scanned images need text extraction first.</span></label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className={`${field} block`}>Audience<select aria-label="Audience" className={control} value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })}><option value="admin_only">Admins only</option><option value="members">Members after publication</option></select></label>
              <label className={`${field} block`}>Official source link <span className="text-zinc-500">(optional)</span><Input type="url" value={form.source_url} onChange={e => setForm({ ...form, source_url: e.target.value })} placeholder="https://…" /></label>
              <label className={`${field} block`}>Effective date <span className="text-zinc-500">(optional)</span><Input type="date" value={form.effective_at} onChange={e => setForm({ ...form, effective_at: e.target.value })} /><span className="block text-xs text-zinc-500">Blank means effective when published. Dates use Lagos time.</span></label>
              <label className={`${field} block`}>Expiry date <span className="text-zinc-500">(optional)</span><Input type="date" value={form.expires_at} onChange={e => setForm({ ...form, expires_at: e.target.value })} /></label>
            </div>
            <label className={`${field} block`}>Replaces entry ID <span className="text-zinc-500">(optional)</span><Input maxLength={12} value={form.replaces} onChange={e => setForm({ ...form, replaces: e.target.value })} placeholder="Previous published version ID" /></label>
            <Button type="submit" disabled={disabled || !status?.knowledge_enabled || (!form.content.trim() && !file)}><FileText className="mr-2 size-4" />Save knowledge draft</Button>
          </form>
          <section className={`${panel} min-w-0 space-y-4`} aria-label="Knowledge entries">
            <div><h2 className="text-lg font-medium">Knowledge entries</h2><p className="mt-1 text-sm text-zinc-500">Review drafts, current sources and earlier versions.</p></div>
            {!knowledge.length && <p className="py-6 text-sm text-zinc-500">{loading ? 'Loading knowledge…' : 'No entries on this page. Add your first guide to start building the library.'}</p>}
            <ul className="divide-y divide-zinc-100">{knowledge.map(item => <li key={item.id}><button type="button" disabled={busy} onClick={() => void selectKnowledge(item)} className={`w-full rounded-lg p-3 text-left transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${selected?.id === item.id ? 'bg-orange-50' : ''}`}><span className="block break-words font-medium">{item.title}</span><span className="mt-1 block text-xs leading-5 text-zinc-500">{item.status} · {audience(item.audience)}</span><span className="block text-xs text-zinc-400">{stamp(item.created_at)}</span></button></li>)}</ul>
            <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={disabled || knowledgePage === 1} onClick={() => void pageList('knowledge', knowledgePage - 1)}>Previous</Button><span className="text-xs text-zinc-500">Page {knowledgePage}</span><Button variant="outline" disabled={disabled || knowledge.length < 25} onClick={() => void pageList('knowledge', knowledgePage + 1)}>Next</Button></div>
          </section>
        </div>
        {selected && <section className={`${panel} space-y-5`} aria-label="Knowledge review">
          <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs uppercase tracking-wide text-zinc-500">Review knowledge · {selected.id}</p><h2 className="mt-1 break-words text-xl font-medium">{selected.title}</h2><p className="mt-2 text-sm text-zinc-500">{selected.status} · {audience(selected.audience)}{selected.status === 'published' ? selected.active ? ' · Currently effective' : ' · Not currently effective' : ''}</p></div><Button variant="ghost" onClick={() => setSelected(null)}>Close review</Button></div>
          <dl className="grid gap-3 text-sm sm:grid-cols-2"><div><dt className="text-zinc-500">Effective / expires (Lagos)</dt><dd>{stamp(selected.effective_at)} / {stamp(selected.expires_at)}</dd></div><div><dt className="text-zinc-500">Source / attachment</dt><dd className="break-all">{selected.source_url || selected.filename || 'Admin text'}</dd></div></dl>
          <div className="max-h-[32rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7" tabIndex={0} aria-label="Full knowledge content">{selected.content}</div>
          {selected.status === 'draft' && <div className="flex flex-col gap-3 sm:flex-row sm:items-end"><label className={field}>Draft audience<select aria-label="Draft audience" className={control} value={draftAudience} onChange={e => setDraftAudience(e.target.value)}><option value="admin_only">Admins only</option><option value="members">Members after publication</option></select></label><Button variant="outline" disabled={busy || draftAudience === selected.audience} onClick={() => void knowledgeAction('knowledgeAudience', { audience: draftAudience })}>Update audience</Button><Button disabled={busy || draftAudience !== selected.audience} onClick={() => { setPublishReview(true); setPublishChecked(false); setRetireReview(false) }}>Review publication</Button></div>}
          {publishReview && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><p className="text-sm leading-6">Publish this exact version for <strong>{audience(selected.audience).toLowerCase()}</strong>. The effective and expiry dates above still apply. Published content cannot be edited; create a replacement version for corrections.</p><label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={publishChecked} onChange={e => setPublishChecked(e.target.checked)} />I reviewed the complete content, audience and dates.</label><div className="flex flex-wrap gap-2"><Button disabled={busy || !publishChecked} onClick={() => void knowledgeAction('publishKnowledge')}>Publish this version</Button><Button variant="ghost" onClick={() => setPublishReview(false)}>Cancel</Button></div></div>}
          {selected.status !== 'draft' && <Button variant="outline" disabled={busy} onClick={() => { setForm({ ...emptyKnowledge, title: selected.title, content: selected.content || '', replaces: selected.id, source_url: selected.source_url || '' }); setNotice('Replacement text is loaded in Add knowledge. Save a new draft and review its audience before publishing.'); window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) }}>Create replacement draft</Button>}
          {selected.status !== 'retired' && <div><Button variant="ghost" className="text-red-700" disabled={busy} onClick={() => { setRetireReview(true); setPublishReview(false) }}>Retire entry</Button>{retireReview && <div className="mt-3 space-y-3 rounded-lg border border-red-200 p-4 text-sm"><p>This entry will stop supporting bot answers and document downloads. Its history will be retained.</p><Button variant="destructive" disabled={busy} onClick={() => void knowledgeAction('retireKnowledge')}>Confirm retirement</Button><Button variant="ghost" onClick={() => setRetireReview(false)}>Cancel</Button></div>}</div>}
          {selected.audit && <details className="text-sm"><summary className="min-h-11 cursor-pointer py-3 font-medium">Publication history</summary><ul className="space-y-2 text-xs text-zinc-500">{selected.audit.map((item, i) => <li key={i} className="break-all">{item.action} · {stamp(item.at)} · {item.actor}</li>)}</ul></details>}
        </section>}
      </TabsContent>
      <TabsContent value="announcements" className="space-y-5">
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          <form className={`${panel} space-y-4`} onSubmit={saveAnnouncement}><div><h2 className="text-lg font-medium">Draft an announcement</h2><p className="mt-1 text-sm leading-6 text-zinc-500">Drafting sends nothing. Review the exact message and test-group destination before sending.</p></div>
            <label className={`${field} block`}>Internal title<Input required maxLength={200} value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} placeholder="e.g. Mentoring reminder" /></label>
            <label className={`${field} block`}>WhatsApp message<Textarea required rows={9} maxLength={3500} value={announcementForm.content} onChange={e => setAnnouncementForm({ ...announcementForm, content: e.target.value })} placeholder="Write the exact announcement members should receive, including links." /><span className="block text-xs text-zinc-500">{announcementForm.content.length.toLocaleString()} / 3,500 characters. This does not automatically add knowledge to the bot.</span></label>
            <Button type="submit" disabled={disabled || !status?.test_group_configured || !announcementForm.content.trim()}>Save announcement draft</Button>
          </form>
          <section className={`${panel} space-y-4`} aria-label="Announcement history"><h2 className="text-lg font-medium">Drafts & delivery history</h2>
            {!announcements.length && <p className="py-6 text-sm text-zinc-500">{loading ? 'Loading announcements…' : 'No announcements on this page. Save a draft to prepare your first message.'}</p>}
            <ul className="divide-y divide-zinc-100">{announcements.map(item => <li key={item.id}><button disabled={busy} onClick={() => void run(async () => { setAnnouncement(await loadBot<Announcement>('announcements', item.id)); setPreview(null); setReviewed(false) })} className={`w-full rounded-lg p-3 text-left hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500 ${announcement?.id === item.id ? 'bg-orange-50' : ''}`}><span className="block break-words font-medium">{item.title}</span><span className="mt-1 block text-xs text-zinc-500">{delivery[item.status]} · {stamp(item.created_at)}</span></button></li>)}</ul>
            <div className="flex items-center justify-between gap-2"><Button variant="outline" disabled={disabled || announcementPage === 1} onClick={() => void pageList('announcements', announcementPage - 1)}>Previous</Button><span className="text-xs text-zinc-500">Page {announcementPage}</span><Button variant="outline" disabled={disabled || announcements.length < 25} onClick={() => void pageList('announcements', announcementPage + 1)}>Next</Button></div>
          </section>
        </div>
        {announcement && <section className={`${panel} space-y-4`} aria-label="Announcement review"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="break-words text-xl font-medium">{announcement.title}</h2><p className="mt-1 text-sm text-zinc-500">{delivery[announcement.status]}</p></div><Button variant="ghost" onClick={() => { setAnnouncement(null); setPreview(null); setReviewed(false) }}>Close review</Button></div>
          <p className="break-all text-sm text-zinc-500">Test-group destination: {announcement.target}</p>
          <div className="whitespace-pre-wrap break-words rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm leading-7">{announcement.content}</div>
          {['sending', 'unconfirmed'].includes(announcement.status) && <p className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6">Check WhatsApp for this message before creating a replacement. The system will not retry a delivery that may already have succeeded.</p>}
          {announcement.status === 'draft' && !preview && <Button disabled={busy || !status?.connected} onClick={() => void announcementPreview()}>Preview for sending</Button>}
          {preview && <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4"><h3 className="font-medium">Confirm this announcement</h3><p className="text-sm leading-6">The exact message above will be sent once to {preview.target}. This preview expires at {stamp(preview.preview_expires_at)} Lagos time.</p>{previewExpired && <p className="text-sm text-red-800">This preview expired. Cancel it and preview again.</p>}<label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={reviewed} onChange={e => setReviewed(e.target.checked)} />I reviewed the complete message and this destination.</label><div className="flex flex-wrap gap-2"><Button disabled={busy || !reviewed || previewExpired} onClick={() => void sendAnnouncement()}><Send className="mr-2 size-4" />Send announcement now</Button><Button variant="ghost" onClick={() => { setPreview(null); setReviewed(false) }}>Cancel preview</Button></div></div>}
          {announcement.audit && <details className="text-sm"><summary className="min-h-11 cursor-pointer py-3 font-medium">Delivery audit</summary><ul className="space-y-2 text-xs text-zinc-500">{announcement.audit.map((item, i) => <li key={i} className="break-all">{item.action} · {stamp(item.at)} · {item.actor}</li>)}</ul></details>}
        </section>}
      </TabsContent>
    </Tabs>
  </div>
}
