'use client'

import { useCallback, useEffect, useState } from 'react'
import { Mail, Plus, RefreshCw, Save } from 'lucide-react'
import { toast } from 'sonner'

type Team = { id: string; name: string }
type Template = { id: string; team_id: string; channel: 'email' | 'whatsapp'; name: string; subject: string | null; body: string; is_active: boolean }
type Draft = Omit<Template, 'id' | 'team_id'> & { id?: string }
const blank: Draft = { channel: 'email', name: '', subject: '', body: '', is_active: true }

export default function TeamTemplates() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState('')
  const [templates, setTemplates] = useState<Template[]>([])
  const [draft, setDraft] = useState<Draft>(blank)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async (selected = '') => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/team-operations/templates${selected ? `?teamId=${selected}` : ''}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not load templates.')
      const availableTeams = payload.teams as Team[]
      setTeams(availableTeams)
      const activeTeam = selected || availableTeams[0]?.id || ''
      if (!selected && activeTeam) {
        setTeamId(activeTeam)
        const next = await fetch(`/api/admin/team-operations/templates?teamId=${activeTeam}`, { cache: 'no-store' })
        const nextPayload = await next.json()
        if (!next.ok) throw new Error(nextPayload.message || 'Could not load templates.')
        setTemplates(nextPayload.templates ?? [])
      } else setTemplates(payload.templates ?? [])
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load templates.')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { void load('') }, []) // Load team list and default team once.

  function edit(template: Template) {
    setDraft({ id: template.id, channel: template.channel, name: template.name, subject: template.subject ?? '', body: template.body, is_active: template.is_active })
  }

  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (!teamId) return
    setSaving(true)
    try {
      const response = await fetch('/api/admin/team-operations/templates', {
        method: draft.id ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, teamId, subject: draft.channel === 'email' ? draft.subject : null }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not save template.')
      toast.success('Template saved.')
      setDraft(blank)
      await load(teamId)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save template.') }
    finally { setSaving(false) }
  }

  return <div className="mx-auto max-w-6xl space-y-5">
    <header className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Team Operations · Communications</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Email templates</h1><p className="mt-2 max-w-2xl text-sm text-zinc-600">Manage branded email and WhatsApp starting messages. Sales reps can personalize each message before they send it.</p></div><button onClick={() => void load(teamId)} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 text-sm"><RefreshCw className="h-4 w-4" />Refresh</button></header>
    <label className="flex max-w-sm flex-col gap-1.5 text-xs font-medium text-zinc-600">Team<select value={teamId} onChange={(event) => { setTeamId(event.target.value); setDraft(blank); void load(event.target.value) }} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900">{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.8fr)]">
      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"><div className="flex items-center justify-between border-b border-zinc-100 px-5 py-4"><div><h2 className="font-semibold">Saved templates</h2><p className="mt-1 text-xs text-zinc-500">{templates.length} templates · Changes apply to future messages</p></div><Mail className="h-5 w-5 text-zinc-400" /></div>{loading ? <p className="p-6 text-sm text-zinc-500">Loading templates…</p> : templates.length ? <div className="divide-y divide-zinc-100">{templates.map((template) => <button key={template.id} onClick={() => edit(template)} className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-zinc-50"><span><span className="block text-sm font-semibold">{template.name}</span><span className="mt-1 block text-xs text-zinc-500">{template.channel === 'email' ? 'Email' : 'WhatsApp'} · {template.is_active ? 'Active' : 'Paused'}{template.subject ? ` · ${template.subject}` : ''}</span></span><span className="text-xs font-medium text-orange-700">Edit</span></button>)}</div> : <p className="p-6 text-sm text-zinc-500">No templates yet. Create one to give reps a starting message.</p>}</section>
      <form onSubmit={save} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Template editor</p><h2 className="mt-1 text-xl font-semibold">{draft.id ? 'Edit message' : 'New message'}</h2></div><button type="button" onClick={() => setDraft(blank)} className="inline-flex items-center gap-1 text-xs text-orange-700"><Plus className="h-4 w-4" />New</button></div>
        <label className="block text-xs font-medium text-zinc-600">Channel<select value={draft.channel} onChange={(event) => setDraft({ ...draft, channel: event.target.value as Draft['channel'] })} className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"><option value="email">Email</option><option value="whatsapp">WhatsApp</option></select></label>
        <label className="block text-xs font-medium text-zinc-600">Template name<input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} required minLength={2} maxLength={120} className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm" /></label>
        {draft.channel === 'email' ? <label className="block text-xs font-medium text-zinc-600">Email subject<input value={draft.subject ?? ''} onChange={(event) => setDraft({ ...draft, subject: event.target.value })} maxLength={200} className="mt-1.5 h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm" /></label> : null}
        <label className="block text-xs font-medium text-zinc-600">Message<textarea value={draft.body} onChange={(event) => setDraft({ ...draft, body: event.target.value })} required minLength={10} maxLength={20000} rows={9} className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm leading-6" /><span className="mt-1 block text-[11px] text-zinc-500">Available fields: {'{{first_name}}'}, {'{{name}}'}, {'{{agent_name}}'}, {'{{organisation}}'}, {'{{award_name}}'}, {'{{payment_link}}'}.</span></label>
        <label className="flex items-center gap-2 text-xs text-zinc-600"><input type="checkbox" checked={draft.is_active} onChange={(event) => setDraft({ ...draft, is_active: event.target.checked })} />Available to sales reps</label>
        <button disabled={saving || !teamId} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Saving…' : 'Save template'}</button>
      </form>
    </div>
  </div>
}
