'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, KeyRound, Loader2, Mail, RefreshCw, Search, Settings2, UserPlus, Users, X } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { formatTeamMoney, type MemberPerformance, type MoneyTotals, type PerformanceResult } from '@/lib/team-operations/performance'
import { AccessCodePanel } from './access-code-panel'
import styles from './team-operations.module.css'

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
type Team = { id: string; name: string; slug: string; description: string | null; is_active: boolean; memberships: Membership[] }
type MemberUpdate = { status?: Membership['status']; role?: 'agent' | 'team_leader' }
const roleLabel = (role: Membership['role']) => role === 'super_admin' ? 'Administrator' : role === 'team_leader' ? 'Team leader' : 'Agent'

export default function TeamOperations() {
  const [teams, setTeams] = useState<Team[]>([])
  const [performance, setPerformance] = useState<PerformanceResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [teamId, setTeamId] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'agent' | 'team_leader'>('agent')
  const [sending, setSending] = useState(false)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('name')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await fetch('/api/admin/team-operations', { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not load team operations.')
      const nextTeams = (payload.teams ?? []) as Team[]
      setTeams(nextTeams)
      setPerformance(payload.performance ?? { available: false, message: 'Performance is unavailable. Refresh to try again.' })
      setTeamId(current => nextTeams.some(team => team.id === current) ? current : nextTeams[0]?.id ?? '')
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'Could not load team operations.'
      setError(message)
      setPerformance(null)
      toast.error(message)
    } finally { setLoading(false) }
  }, [])
  // The initial request and manual refresh share the same loading/error lifecycle.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load() }, [load])

  const team = teams.find(item => item.id === teamId)
  const members = useMemo(() => team?.memberships ?? [], [team])
  const available = performance?.available === true ? performance : null
  const totals = available?.teams[teamId]
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase()
    return members.filter(member => (status === 'all' || member.status === status) && (!query || `${member.full_name} ${member.email}`.toLowerCase().includes(query)))
      .sort((a, b) => {
        if (sort === 'ngn' && available) {
          const difference = (available.members[b.id]?.revenue.NGN ?? 0) - (available.members[a.id]?.revenue.NGN ?? 0)
          if (difference) return difference
        }
        return a.full_name.localeCompare(b.full_name)
      })
  }, [members, search, status, sort, available])

  async function updateMember(member: Membership, update: MemberUpdate) {
    if (busyId) return
    setBusyId(member.id)
    try {
      const response = await fetch(`/api/admin/team-operations/${member.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(update) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not update team access.')
      toast.success(update.status === 'active' ? 'Team access approved.' : 'Team access updated.')
      await load()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Could not update team access.') }
    finally { setBusyId(null) }
  }

  async function inviteMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!teamId || sending) return
    setSending(true)
    try {
      const response = await fetch('/api/admin/team-operations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId, fullName: name, email, role }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not send the invitation.')
      toast.success(payload.message || 'Invitation sent.')
      setName(''); setEmail(''); setRole('agent'); setInviteOpen(false)
      await load()
    } catch (cause) { toast.error(cause instanceof Error ? cause.message : 'Could not send the invitation.') }
    finally { setSending(false) }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div><p className={styles.eyebrow}>People · Operations</p><h1>Team Operations</h1><p>Review award value and manage team access.</p></div>
        <nav className={styles.actions} aria-label="Team operations">
          <Link className={styles.button} href="/admin/team-operations/worklist"><Users size={16} aria-hidden="true" />Awardee worklist</Link>
          <Link className={styles.button} href="/admin/team-operations/templates"><Mail size={16} aria-hidden="true" />Email templates</Link>
          <button className={styles.button} onClick={() => void load()} disabled={loading}><RefreshCw size={16} className={loading ? 'animate-spin' : ''} aria-hidden="true" />Refresh</button>
        </nav>
      </header>

      {teams.length > 1 ? <label className={styles.teamSelect}>Team<select value={teamId} onChange={event => { setTeamId(event.target.value); setSearch(''); setStatus('all') }}>{teams.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : null}
      {error ? <p role="alert" className={styles.notice}>{error} Use Refresh to try again.</p> : null}

      <div className={styles.tools}>
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild><button className={styles.tool} disabled={!teamId || loading}><UserPlus size={20} aria-hidden="true" /><span><strong>Invite a member</strong><span>Add an agent or team leader</span></span><ArrowUpRight size={17} aria-hidden="true" /></button></DialogTrigger>
          <DialogContent className={styles.dialog}>
            <DialogHeader><DialogTitle>Invite a member</DialogTitle><DialogDescription>Invite someone to {team?.name ?? 'your team'}. They remain pending until you approve their access.</DialogDescription></DialogHeader>
            <form onSubmit={inviteMember} className={styles.form}>
              <Field label="Full name"><input autoComplete="name" value={name} onChange={event => setName(event.target.value)} required minLength={2} maxLength={120} /></Field>
              <Field label="Email"><input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required /></Field>
              <Field label="Team role"><select value={role} onChange={event => setRole(event.target.value as 'agent' | 'team_leader')}><option value="agent">Agent</option><option value="team_leader">Team leader</option></select></Field>
              <button className={`${styles.button} ${styles.primary}`} type="submit" disabled={sending || !teamId}>{sending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <UserPlus size={16} aria-hidden="true" />}Send invite</button>
            </form>
          </DialogContent>
        </Dialog>
        <Dialog>
          <DialogTrigger asChild><button className={styles.tool} disabled={!teamId || loading}><KeyRound size={20} aria-hidden="true" /><span><strong>Rep access codes</strong><span>Create codes and review their use</span></span><ArrowUpRight size={17} aria-hidden="true" /></button></DialogTrigger>
          <DialogContent className={`${styles.dialog} ${styles.codeDialog}`}>
            <DialogHeader><DialogTitle>One-time access codes</DialogTitle><DialogDescription>Codes expire after seven days and work once. New accounts still need admin approval.</DialogDescription></DialogHeader>
            {teamId ? <AccessCodePanel key={teamId} teamId={teamId} /> : null}
          </DialogContent>
        </Dialog>
      </div>

      <section className={styles.performance} aria-labelledby="team-performance-heading">
        <div className={styles.sectionHeading}><div><h2 id="team-performance-heading">{team?.name ?? 'Team performance'}</h2><p>All time · Credited award value in NGN, excluding delivery</p></div><div className={styles.statusCounts}>{loading && !members.length ? <span>Loading members…</span> : error && !members.length ? <span>Team access unavailable</span> : <><span>{members.filter(member => member.status === 'active').length} active</span><span>{members.filter(member => member.status === 'invited').length} awaiting approval</span><span>{members.filter(member => member.status === 'suspended').length} suspended</span></>}</div></div>
        {!loading && performance && !performance.available ? <p role="status" className={styles.notice}>{performance.message}</p> : null}
        <div className={styles.metrics}>
          <Summary label="Assigned now" value={loading ? '—' : totals?.assignedCount ?? (available && !members.length ? 0 : '—')} />
          <Summary label="Payments credited" value={loading ? '—' : totals?.paidCount ?? (available && !members.length ? 0 : '—')} />
          <Summary label="Award value (NGN)" value={<Money totals={loading ? undefined : totals?.revenue} />} />
          <Summary label="Confirmed commission (NGN)" value={<Money totals={loading ? undefined : totals?.confirmedCommission} />} />
        </div>
        {!loading && available && available.unattributedPayments[teamId] > 0 ? <p className={styles.help}>{available.unattributedPayments[teamId]} confirmed payments are excluded from rep totals because no qualifying outreach was recorded before payment. The awardees remain paid.</p> : null}
        <details className={styles.explanation}>
          <summary>How totals work{available && available.unattributedPayments[teamId] > 0 ? ` · ${available.unattributedPayments[teamId]} payments without qualifying rep outreach` : ''}</summary>
          <p className={styles.help}>Standard award value is ₦25,000 per award; it is not an FX conversion.</p>
          <p className={styles.help}>Only verified payments with a recorded qualifying outreach by the assigned rep before payment earn credit. Independent payments are excluded from rep totals and released. A manual WhatsApp click alone is not evidence of qualifying outreach.</p>
          {available && available.unattributedPayments[teamId] > 0 ? <p className={styles.help}>These payments remain confirmed for the awardee. They earn no rep commission and are removed from rep assignments.</p> : null}
        </details>
      </section>

      <section aria-label="Team members" className={styles.members}>
        <div className={styles.toolbar}>
          <label className={styles.search}><Search size={16} aria-hidden="true" /><input type="search" aria-label="Search team members" placeholder="Search name or email" value={search} onChange={event => setSearch(event.target.value)} /></label>
          <select aria-label="Filter members by status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option><option value="active">Active</option><option value="invited">Awaiting approval</option><option value="suspended">Suspended</option></select>
          <select aria-label="Sort team members" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Name A–Z</option><option value="ngn" disabled={!available}>Award value · NGN</option></select>
        </div>
        {loading && !members.length ? <div className={styles.empty} role="status"><Loader2 className="animate-spin" size={20} aria-hidden="true" />Loading team performance…</div> : visible.length ? <>
          <p className={styles.resultCount}>{visible.length} of {members.length} members</p>
          <div className={styles.memberGrid}>{visible.map(member => <MemberCard key={member.id} member={member} performance={available?.members[member.id]} busy={busyId !== null} updateMember={updateMember} />)}</div>
        </> : <div className={styles.empty}>{members.length ? 'No members match your search or status filter.' : team ? 'No team memberships yet. Invite a member to get started.' : error ? 'Team members could not be loaded.' : 'No teams have been created yet.'}{members.length ? <button className={styles.button} onClick={() => { setSearch(''); setStatus('all') }}>Clear filters</button> : null}</div>}
      </section>
    </div>
  )
}

function MemberCard({ member, performance, busy, updateMember }: { member: Membership; performance?: MemberPerformance; busy: boolean; updateMember: (member: Membership, update: MemberUpdate) => Promise<void> }) {
  const fixedAdmin = member.role === 'super_admin'
  return <article className={styles.member} aria-label={`${member.full_name} performance`}>
    <header className={styles.memberHeader}><span className={styles.avatar} aria-hidden="true">{member.full_name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span><div><h3>{member.full_name}</h3><p>{member.email}</p></div></header>
    <div className={styles.memberMeta}><span>{roleLabel(member.role)}</span><span className={`${styles.badge} ${member.status === 'active' ? styles.active : member.status === 'invited' ? styles.invited : styles.suspended}`}>{member.status === 'invited' ? 'Awaiting approval' : member.status}</span></div>
    <div className={styles.memberValue}><div><p className={styles.memberValueLabel}>Award value</p><Money totals={performance?.revenue} /></div><span className={styles.currencyTag}>NGN</span></div>
    <dl className={styles.memberStats}><div><dt>Assigned now</dt><dd>{performance?.assignedCount ?? '—'}</dd></div><div><dt>Payments credited</dt><dd>{performance?.paidCount ?? '—'}</dd></div></dl>
    <dl className={styles.commissions}><div><dt>Confirmed commission (NGN)</dt><dd><Money totals={performance?.confirmedCommission} /></dd></div><div><dt>Pending commission (NGN)</dt><dd><Money totals={performance?.pendingCommission} /></dd></div></dl>
    <Dialog>
      <DialogTrigger asChild><button className={styles.manage} aria-label={`Manage access for ${member.full_name}`}><Settings2 size={15} aria-hidden="true" />Manage access<span className="sr-only"> for {member.full_name}</span><ArrowUpRight size={15} aria-hidden="true" /></button></DialogTrigger>
      <DialogContent className={styles.dialog}>
        <DialogHeader><DialogTitle>Manage team access</DialogTitle><DialogDescription>{member.full_name} · {member.email}</DialogDescription></DialogHeader>
        <p className={styles.help}>Current status: {member.status === 'invited' ? 'awaiting approval' : member.status}.</p>
        {fixedAdmin ? <p className={styles.help}>This membership is managed through Top100 administrator access.</p> : <div className={styles.form}>
          <Field label="Team role"><select aria-label={`Role for ${member.full_name}`} value={member.role} onChange={event => void updateMember(member, { role: event.target.value as 'agent' | 'team_leader' })} disabled={busy}><option value="agent">Agent</option><option value="team_leader">Team leader</option></select></Field>
          <button className={`${styles.button} ${member.status === 'active' ? '' : styles.primary}`} disabled={busy} onClick={() => void updateMember(member, { status: member.status === 'active' ? 'suspended' : 'active' })}>{busy ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : member.status === 'active' ? <X size={16} aria-hidden="true" /> : <Check size={16} aria-hidden="true" />}{member.status === 'active' ? 'Suspend access' : member.status === 'suspended' ? 'Restore access' : 'Approve access'}</button>
        </div>}
      </DialogContent>
    </Dialog>
  </article>
}

function Money({ totals }: { totals?: MoneyTotals }) {
  if (!totals) return <span className={styles.money}>—</span>
  return <span className={styles.money}><span>{formatTeamMoney(totals.NGN, 'NGN')}</span></span>
}
function Summary({ label, value }: { label: string; value: React.ReactNode }) { return <div className={styles.metric}><p>{label}</p><div>{value}</div></div> }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className={styles.field}>{label}{children}</label> }
