'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import PageHeader from '../components/PageHeader'
import { PlanningCalendar } from './planning-calendar'
import { Records } from './records'
import { Interests } from './interests'
import { ProgrammeRegister } from './programme-register'
import { Reports } from './reports'
import { selectPriorities } from '@/lib/programme-manager/priorities'

type Task = { id: string; title: string; programme: string; owner: string; due_date: string | null; priority: 'P0' | 'P1' | 'P2'; status: 'not_started' | 'in_progress' | 'blocked' | 'done'; blocker: string }
type Draft = Omit<Task, 'id'>
const empty: Draft = { title: '', programme: '', owner: '', due_date: null, priority: 'P1', status: 'not_started', blocker: '' }
const labels: Record<Task['status'], string> = { not_started: 'Not started', in_progress: 'In progress', blocked: 'Blocked', done: 'Done' }
const field = 'mt-1 w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900'

export default function ProgrammesPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<Draft>(empty)
  const [editing, setEditing] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [tab, setTab] = useState<'overview' | 'tasks' | 'calendar' | 'partners' | 'impact' | 'interests' | 'programmes' | 'reports'>('overview')
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/programme-manager', { cache: 'no-store' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Could not load tasks.')
      setTasks(body.tasks); setHasLoaded(true); setError('')
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not load tasks.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void load() }, [load])
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Lagos', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())
  const priorities = selectPriorities(tasks, today)
  const overdue = tasks.filter(task => task.status !== 'done' && task.due_date && task.due_date < today).length
  const blocked = tasks.filter(task => task.status === 'blocked').length
  const undated = tasks.filter(task => task.status !== 'done' && !task.due_date).length
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    try {
      const res = await fetch('/api/admin/programme-manager', { method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing ? { ...draft, id: editing } : draft) })
      const body = await res.json()
      if (!res.ok) throw new Error(body.message || 'Could not save task.')
      setTasks((old) => editing ? old.map((task) => task.id === editing ? body.task : task) : [...old, body.task])
      setDraft(empty); setEditing(null)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save task.') }
    finally { setSaving(false) }
  }
  const edit = (task: Task) => { const { id, ...values } = task; setDraft(values); setEditing(id); setTab('tasks'); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const taskList = (items: Task[]) => items.length ? <ul className="divide-y divide-neutral-200">{items.map((task) => <li key={task.id} className="flex flex-wrap items-start justify-between gap-3 py-4"><div className="min-w-0"><p className="font-medium text-neutral-950">{task.title}</p><p className="mt-1 text-sm text-neutral-600">{task.programme} · {task.owner || 'Owner not assigned'} · {task.due_date || 'No due date'} · {labels[task.status]} · {task.priority}</p>{task.blocker && <p className="mt-1 text-sm text-red-700">Blocker: {task.blocker}</p>}</div><button type="button" onClick={() => edit(task)} className="min-h-11 rounded-md border border-neutral-300 px-3 text-sm">Edit task</button></li>)}</ul> : <p className="py-4 text-sm text-neutral-600">No tasks to show.</p>
  return <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-8">
    <PageHeader title="Programmes & Impact" description="Plan the work, keep owners accountable, and see what needs attention." />
    <nav aria-label="Programme manager" className="flex flex-wrap gap-2">{(['overview', 'tasks', 'calendar', 'programmes', 'partners', 'impact', 'interests', 'reports'] as const).map((item) => <button key={item} type="button" onClick={() => setTab(item)} aria-pressed={tab === item} className={`min-h-11 rounded-md px-4 text-sm font-medium ${tab === item ? 'bg-neutral-900 text-white' : 'border border-neutral-300 bg-white text-neutral-800'}`}>{item === 'calendar' ? '2027 Calendar' : item === 'tasks' ? 'Tasks' : item === 'programmes' ? 'Programmes' : item === 'partners' ? 'Partnerships' : item === 'impact' ? 'Impact' : item === 'interests' ? 'Member interest' : item === 'reports' ? 'Weekly summaries' : 'Overview'}</button>)}</nav>
    {error && <div role="alert" className="rounded-md border border-red-300 bg-red-50 p-4 text-sm text-red-900">{error} <button type="button" onClick={() => { setLoading(true); void load() }} className="underline">Retry loading</button></div>}
    {loading ? <p>Loading programme tasks…</p> : !hasLoaded ? <p className="text-sm text-neutral-600">Programme tasks are unavailable. Retry to continue.</p> : <>
      {tab === 'overview' && <div className="grid gap-6 lg:grid-cols-3"><section className="rounded-lg border bg-white p-5 lg:col-span-2"><h2 className="text-lg font-semibold">This week’s priorities</h2><p className="mt-1 text-sm text-neutral-600">Up to five unfinished tasks due by Sunday, including overdue work. Add a due date to include a task.</p>{taskList(priorities)}</section><section className="rounded-lg border bg-white p-5"><h2 className="text-lg font-semibold">Start here</h2><p className="mt-2 text-sm text-neutral-600">{overdue} overdue · {blocked} blocked · {undated} without a due date</p><p className="mt-2 text-sm text-neutral-600">Project100 comes first. Assign owners and dates to the initial actions, then record any blockers.</p><button onClick={() => setTab('tasks')} className="mt-4 min-h-11 rounded-md bg-amber-300 px-4 text-sm font-medium text-neutral-950">Manage tasks</button><p className="mt-6 text-sm text-neutral-600">The 2027 calendar is a plan. Activities are not scheduled or announced.</p><Link className="mt-3 inline-block text-sm underline" href="/admin/events">Open existing events and invitations</Link></section></div>}
      {tab === 'tasks' && <div className="grid gap-6 lg:grid-cols-3"><form onSubmit={save} className="space-y-4 rounded-lg border bg-white p-5"><h2 className="text-lg font-semibold">{editing ? 'Edit task' : 'Add a task'}</h2><label className="block text-sm">Action<input required maxLength={240} className={field} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></label><label className="block text-sm">Programme<input required maxLength={160} className={field} value={draft.programme} onChange={(e) => setDraft({ ...draft, programme: e.target.value })} /></label><label className="block text-sm">Accountable owner<input maxLength={120} className={field} value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} /></label><label className="block text-sm">Due date<input type="date" className={field} value={draft.due_date || ''} onChange={(e) => setDraft({ ...draft, due_date: e.target.value || null })} /></label><label className="block text-sm">Priority<select className={field} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: e.target.value as Task['priority'] })}><option value="P0">P0 · Critical</option><option value="P1">P1 · High</option><option value="P2">P2 · Later</option></select></label><label className="block text-sm">Status<select className={field} value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as Task['status'] })}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm">Blocker or decision needed<textarea maxLength={1000} className={field} value={draft.blocker} onChange={(e) => setDraft({ ...draft, blocker: e.target.value })} /></label><div className="flex gap-3"><button disabled={saving} className="min-h-11 rounded-md bg-neutral-900 px-4 text-sm text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save task'}</button>{editing && <button type="button" onClick={() => { setEditing(null); setDraft(empty) }} className="min-h-11 px-3 text-sm">Cancel</button>}</div></form><section className="rounded-lg border bg-white p-5 lg:col-span-2"><h2 className="text-lg font-semibold">All tasks</h2>{taskList(tasks)}</section></div>}
      {tab === 'calendar' && <PlanningCalendar />}
      {tab === 'programmes' && <ProgrammeRegister />}
      {tab === 'partners' && <Records key="partners" kind="partner" />}
      {tab === 'impact' && <Records key="impact" kind="outcome" />}
      {tab === 'interests' && <Interests />}
      {tab === 'reports' && <Reports />}
    </>}
  </div>
}
