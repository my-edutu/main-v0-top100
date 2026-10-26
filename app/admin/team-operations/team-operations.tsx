'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BriefcaseBusiness, Check, Clock3, Loader2, RefreshCw, UserPlus, Users, X } from 'lucide-react'
import { toast } from 'sonner'

type Membership = {
  id: string
  team_id: string
  user_id: string | null
  email: string
  full_name: string
  role: 'super_admin' | 'team_leader' | 'agent'
  status: 'invited' | 'active' | 'suspended'
  phone: string | null
  joined_at: string | null
}

type Team = {
  id: string
  name: string
  slug: string
  description: string | null
  is_active: boolean
  memberships: Membership[]
}

export default function TeamOperations() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [teamId, setTeamId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'agent' | 'team_leader'>('agent')
  const [sending, setSending] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/team-operations', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not load team operations.')
      const nextTeams = (payload.teams ?? []) as Team[]
      setTeams(nextTeams)
      setTeamId((current) => nextTeams.some((team) => team.id === current) ? current : nextTeams[0]?.id ?? '')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load team operations.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const team = useMemo(() => teams.find((item) => item.id === teamId) ?? null, [teams, teamId])
  const members = team?.memberships ?? []
  const pending = members.filter((member) => member.status === 'invited').length
  const active = members.filter((member) => member.status === 'active').length
  const suspended = members.filter((member) => member.status === 'suspended').length

  async function updateMember(member: Membership, update: { status?: Membership['status']; role?: 'agent' | 'team_leader' }) {
    setBusyId(member.id)
    try {
      const response = await fetch(`/api/admin/team-operations/${member.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not update team access.')
      toast.success(update.status === 'active' ? 'Team access approved.' : 'Team access updated.')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not update team access.')
    } finally {
      setBusyId(null)
    }
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!teamId) return
    setSending(true)
    try {
      const response = await fetch('/api/admin/team-operations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, fullName: name, email, role }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not send the invitation.')
      toast.success(payload.message || 'Invitation sent.')
      setName(''); setEmail(''); setRole('agent')
      await load()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send the invitation.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">People · Operations</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Team Operations</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600">Manage teams and approve access to the team workspace from the Top100 admin panel.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/team-operations/worklist" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800"><Users className="h-4 w-4" /> Awardee worklist</Link>
          <button onClick={() => void load()} className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {teams.length > 1 ? (
        <label className="flex max-w-sm flex-col gap-1.5 text-xs font-medium text-zinc-600">Team
          <select value={teamId} onChange={(event) => setTeamId(event.target.value)} className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm text-zinc-900">
            {teams.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric icon={Users} label="Active members" value={active} />
        <Metric icon={Clock3} label="Awaiting approval" value={pending} tone="amber" />
        <Metric icon={BriefcaseBusiness} label="Suspended" value={suspended} tone="slate" />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="font-semibold">{team?.name ?? 'Team access'}</h2>
            <p className="mt-1 text-xs text-zinc-500">Approve or suspend access, and assign team roles.</p>
          </div>
          {loading ? <div className="flex justify-center p-10"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div> : members.length ? (
            <div className="divide-y divide-zinc-100">
              {members.map((member) => {
                const fixedAdmin = member.role === 'super_admin'
                return <div key={member.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{member.full_name}</p>
                    <p className="truncate text-xs text-zinc-500">{member.email}</p>
                    <p className="mt-1 text-[11px] text-zinc-500">{fixedAdmin ? 'Top100 administrator' : member.role === 'team_leader' ? 'Team leader' : 'Agent'} · {member.status}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {!fixedAdmin ? <select aria-label={`Role for ${member.full_name}`} value={member.role} onChange={(event) => void updateMember(member, { role: event.target.value as 'agent' | 'team_leader' })} disabled={busyId === member.id} className="h-9 rounded-lg border border-zinc-200 bg-white px-2 text-xs">
                      <option value="agent">Agent</option><option value="team_leader">Team leader</option>
                    </select> : null}
                    {!fixedAdmin && member.status !== 'active' ? <button onClick={() => void updateMember(member, { status: 'active' })} disabled={busyId === member.id} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"><Check className="h-3.5 w-3.5" /> Approve</button> : null}
                    {!fixedAdmin && member.status === 'active' ? <button onClick={() => void updateMember(member, { status: 'suspended' })} disabled={busyId === member.id} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"><X className="h-3.5 w-3.5" /> Suspend</button> : null}
                    {!fixedAdmin && member.status === 'suspended' ? <button onClick={() => void updateMember(member, { status: 'active' })} disabled={busyId === member.id} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white hover:bg-emerald-800"><Check className="h-3.5 w-3.5" /> Restore</button> : null}
                    {busyId === member.id ? <Loader2 className="h-4 w-4 animate-spin text-zinc-400" /> : null}
                  </div>
                </div>
              })}
            </div>
          ) : <div className="p-10 text-center text-sm text-zinc-500">{teams.length ? 'No team memberships yet.' : 'No teams have been created yet.'}</div>}
        </section>

        <form onSubmit={inviteMember} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5">
          <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Team access</p><h2 className="mt-1 text-xl font-semibold">Invite a member</h2><p className="mt-1 text-xs leading-5 text-zinc-500">Invited members remain pending until you approve them.</p></div>
          <Field label="Full name"><input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm" /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="h-10 w-full rounded-xl border border-zinc-200 px-3 text-sm" /></Field>
          <Field label="Team role"><select value={role} onChange={(event) => setRole(event.target.value as 'agent' | 'team_leader')} className="h-10 w-full rounded-xl border border-zinc-200 bg-white px-3 text-sm"><option value="agent">Agent</option><option value="team_leader">Team leader</option></select></Field>
          <button type="submit" disabled={sending || !teamId} className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />} Send invite</button>
          {!teamId ? <p className="text-xs text-amber-700">Create or activate a team before inviting members.</p> : null}
        </form>
      </div>
    </div>
  )
}

function Metric({ icon: Icon, label, value, tone = 'green' }: { icon: typeof Users; label: string; value: number; tone?: 'green' | 'amber' | 'slate' }) {
  const color = tone === 'amber' ? 'bg-amber-50 text-amber-800' : tone === 'slate' ? 'bg-zinc-100 text-zinc-700' : 'bg-emerald-50 text-emerald-800'
  return <div className="flex items-center gap-3 rounded-2xl border border-zinc-200 bg-white p-4"><span className={`rounded-xl p-2.5 ${color}`}><Icon className="h-4 w-4" /></span><div><p className="text-xs text-zinc-500">{label}</p><p className="mt-0.5 text-xl font-semibold">{value}</p></div></div>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-xs font-medium text-zinc-600">{label}{children}</label>
}
