'use client'

import { useEffect, useState } from 'react'
import { deliveryReadiness } from '@/lib/programme-manager/budget'

type Cost = { name: string; essential: boolean; estimated: number | null; quoted: number | null; quote_evidence: string; in_kind: number; in_kind_evidence: string; spent: number | null; spending_evidence: string }
type Activity = { id: string; title: string; month: number; format: string; lead: string; partner: string; gate: string; decision_rule: string; target: string; priority: 'P0' | 'P1' | 'P2'; status: 'planned' | 'approved'; open_for_interest: boolean; linked_event_id: string | null; costs: Cost[]; cash_received: number; cash_evidence: string }
type Draft = Omit<Activity, 'id'>
const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
const blank: Draft = { title: '', month: 1, format: '', lead: '', partner: '', gate: '', decision_rule: '', target: '', priority: 'P1', status: 'planned', open_for_interest: false, linked_event_id: null, costs: [], cash_received: 0, cash_evidence: '' }
const input = 'mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm'
const money = (value: number | null) => value === null ? '' : String(value / 100)
const toKobo = (value: string) => value === '' ? null : Math.round(Number(value) * 100)

export function PlanningCalendar() {
  const [items, setItems] = useState<Activity[]>([])
  const [events, setEvents] = useState<{ id: string; title: string }[]>([])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    Promise.all([fetch('/api/admin/programme-manager/activities', { cache: 'no-store' }), fetch('/api/events?scope=admin', { cache: 'no-store' })]).then(async ([a, e]) => {
      if (!a.ok) throw new Error('Calendar could not be loaded. Refresh to try again.')
      setItems((await a.json()).activities)
      if (e.ok) setEvents(await e.json())
      else setMessage('Existing events could not be loaded. Calendar editing remains available.')
    }).catch((error) => setMessage(error.message)).finally(() => setLoading(false))
  }, [])
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!draft) return
    setSaving(true); setMessage('')
    try {
      const response = await fetch('/api/admin/programme-manager/activities', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { ...draft, id: editing } : draft) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.message)
      setItems((old) => editing ? old.map((item) => item.id === editing ? result.activity : item) : [...old, result.activity])
      setDraft(null); setEditing(null); setMessage('Activity saved.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not save activity.') }
    finally { setSaving(false) }
  }
  const edit = (item: Activity) => { const { id, ...rest } = item; setEditing(id); setDraft({ ...rest, costs: rest.costs.map(cost => ({ ...cost, spent: cost.spent ?? null, spending_evidence: cost.spending_evidence ?? '' })) }) }
  const costChange = (index: number, patch: Partial<Cost>) => { if (draft) setDraft({ ...draft, costs: draft.costs.map((cost, i) => i === index ? { ...cost, ...patch } : cost) }) }
  const readiness = draft && deliveryReadiness(draft.costs, draft.cash_received)
  return <section className="space-y-5 rounded-lg border bg-white p-5"><div><h2 className="text-lg font-semibold">2027 planning calendar</h2><p className="mt-1 text-sm text-neutral-600">Planning records are private. Linking an event does not publish it or send invitations.</p></div>
    {message && <p role="status" className="rounded border p-3 text-sm">{message}</p>}
    {!draft && <button type="button" onClick={() => { setEditing(null); setDraft(blank) }} className="min-h-11 rounded bg-neutral-900 px-4 text-sm text-white">Add activity</button>}
    {draft && <form onSubmit={save} className="space-y-4 rounded border p-4"><h3 className="font-semibold">{editing ? 'Edit activity' : 'New activity'}</h3><div className="grid gap-4 md:grid-cols-2">
      <label className="text-sm">Activity<input className={input} required maxLength={240} value={draft.title} onChange={e => setDraft({ ...draft, title: e.target.value })} /></label>
      <label className="text-sm">Month<select className={input} value={draft.month} onChange={e => setDraft({ ...draft, month: Number(e.target.value) })}>{months.map((month, i) => <option key={month} value={i + 1}>{month}</option>)}</select></label>
      {([['format','Format'],['lead','Accountable lead'],['partner','Partner or host'],['gate','Launch gate'],['decision_rule','Go / no-go rule'],['target','Planning target']] as const).map(([key,label]) => <label className="text-sm" key={key}>{label}<input className={input} value={draft[key]} onChange={e => setDraft({ ...draft, [key]: e.target.value })} /></label>)}
      <label className="text-sm">Priority<select className={input} value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value as Draft['priority'] })}><option>P0</option><option>P1</option><option>P2</option></select></label>
      <label className="text-sm">Link to existing event<select className={input} value={draft.linked_event_id || ''} onChange={e => setDraft({ ...draft, linked_event_id: e.target.value || null })}><option value="">No linked event</option>{draft.linked_event_id && !events.some(event => event.id === draft.linked_event_id) && <option value={draft.linked_event_id}>Existing link unavailable</option>}{events.map(event => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
    </div><h4 className="pt-2 font-medium">Budget and funding · NGN</h4><p className="text-sm text-neutral-600">Estimates are planning allowances. Essential costs need quotes and evidence; in-kind support and cash received need evidence before approval. Founder contribution target: ₦0.</p>
    {draft.costs.map((cost, index) => <fieldset key={index} className="grid gap-3 rounded border p-3 md:grid-cols-2"><legend className="px-1 text-sm">Expense {index + 1}</legend><label className="text-sm">Expense name<input className={input} required maxLength={120} value={cost.name} onChange={e => costChange(index, { name: e.target.value })} /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={cost.essential} onChange={e => costChange(index, { essential: e.target.checked })} /> Essential for delivery</label>
      {([['estimated','Estimated cost'],['quoted','Quoted cost'],['in_kind','Confirmed in-kind'],['spent','Actual expenditure']] as const).map(([key,label]) => <label className="text-sm" key={key}>{label}<input className={input} type="number" min="0" step="0.01" max="10000000000" value={money(cost[key])} onChange={e => costChange(index, { [key]: key === 'in_kind' ? (toKobo(e.target.value) ?? 0) : toKobo(e.target.value) })} /></label>)}
      <label className="text-sm">Spending evidence<input className={input} maxLength={500} value={cost.spending_evidence} onChange={e => costChange(index, { spending_evidence: e.target.value })} /></label><label className="text-sm">Quote evidence<input className={input} maxLength={500} value={cost.quote_evidence} onChange={e => costChange(index, { quote_evidence: e.target.value })} /></label><label className="text-sm">In-kind evidence<input className={input} maxLength={500} value={cost.in_kind_evidence} onChange={e => costChange(index, { in_kind_evidence: e.target.value })} /></label><button type="button" className="min-h-11 text-left text-sm underline" onClick={() => setDraft({ ...draft, costs: draft.costs.filter((_, i) => i !== index) })}>Remove expense</button></fieldset>)}
    <button type="button" className="min-h-11 rounded border px-3 text-sm" onClick={() => setDraft({ ...draft, costs: [...draft.costs, { name: '', essential: true, estimated: null, quoted: null, quote_evidence: '', in_kind: 0, in_kind_evidence: '', spent: null, spending_evidence: '' }] })}>Add expense</button>
    <div className="grid gap-4 md:grid-cols-2"><label className="text-sm">Funding received (₦)<input className={input} type="number" min="0" max="10000000000" step="0.01" value={money(draft.cash_received)} onChange={e => setDraft({ ...draft, cash_received: toKobo(e.target.value) ?? 0 })} /></label><label className="text-sm">Funding evidence<input className={input} maxLength={500} value={draft.cash_evidence} onChange={e => setDraft({ ...draft, cash_evidence: e.target.value })} /></label><label className="text-sm">Delivery status<select className={input} value={draft.status} onChange={e => setDraft({ ...draft, status: e.target.value as Draft['status'] })}><option value="planned">Planned</option><option value="approved">Approved for delivery</option></select></label></div><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.open_for_interest} onChange={e => setDraft({ ...draft, open_for_interest: e.target.checked })} /> Open approved activity for member interest</label><p className="text-sm">{readiness?.shortfall === null ? 'Funding gap unknown: add quotes for essential costs.' : `Essential funding gap: ₦${((readiness?.shortfall ?? 0) / 100).toLocaleString('en-NG')}. Evidence is also required for approval.`}</p><p className="text-sm">Estimates: ₦{(draft.costs.reduce((sum, cost) => sum + (cost.estimated ?? 0), 0) / 100).toLocaleString('en-NG')} · Quotes: ₦{(draft.costs.reduce((sum, cost) => sum + (cost.quoted ?? 0), 0) / 100).toLocaleString('en-NG')} · Confirmed in-kind: ₦{(draft.costs.reduce((sum, cost) => sum + cost.in_kind, 0) / 100).toLocaleString('en-NG')} (unknown amounts excluded).</p><p className="text-sm">Recorded expenditure: ₦{(draft.costs.reduce((sum, cost) => sum + (cost.spent ?? 0), 0) / 100).toLocaleString('en-NG')} (unknown amounts excluded).</p><div className="flex gap-3"><button disabled={saving} className="min-h-11 rounded bg-neutral-900 px-4 text-sm text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save activity'}</button><button type="button" className="min-h-11 px-3 text-sm" onClick={() => setDraft(null)}>Cancel</button></div></form>}
    {loading ? <p>Loading calendar…</p> : <div className="divide-y">{[...items].sort((a,b) => a.month - b.month).map(item => <article key={item.id} className="flex flex-wrap justify-between gap-3 py-4"><div><p className="text-xs uppercase tracking-wide text-neutral-600">{months[item.month - 1]} · {item.priority} · {item.status === 'approved' ? 'Approved for delivery' : 'Planned'}</p><h3 className="mt-1 font-medium">{item.title}</h3><p className="mt-1 text-sm text-neutral-600">{item.format} · {item.lead || 'Lead unassigned'}</p><details className="mt-2 text-sm"><summary>Planning gates</summary><p>Partner: {item.partner || 'Unconfirmed'}</p><p>Gate: {item.gate || 'Not recorded'}</p><p>Decision rule: {item.decision_rule || 'Not recorded'}</p></details></div><button type="button" onClick={() => edit(item)} className="min-h-11 rounded border px-3 text-sm">Edit activity</button></article>)}</div>}
  </section>
}
