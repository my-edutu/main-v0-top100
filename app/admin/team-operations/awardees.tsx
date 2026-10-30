'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Shuffle,
  Users,
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type Team = { id: string; name: string }
type Agent = { id: string; full_name: string; email: string; workload: number }
type Row = {
  id: string
  name: string
  country: string | null
  phone: string | null
  email: string | null
  address: string | null
  payment_status: string
  payment_source_id: string | null
  payment_verified_at: string | null
  agent_id: string | null
  agent_name: string | null
  contact_status: string
  next_followup_at: string | null
}
type Snapshot = {
  settings: { defaultCountry: string; maxAwardeesPerAgent: number }
  agents: Agent[]
  years: Array<{ year: number; total: number; unpaid: number }>
  countryOptions: Array<{ country: string; total: number; unpaid: number }>
  rows: Row[]
  total: number
  page: number
  pages: number
  autoAssignEnabled: boolean
  repairRequired: boolean
  summary: {
    total: number
    assigned: number
    unassigned: number
    unpaid_unassigned: number
    paid: number
  } | null
}
type Result = {
  loaded: number
  assigned: number
  capacity_skipped: number
  country: string
  year: number
}
const control =
  'h-11 min-w-0 rounded-xl border border-zinc-200 bg-white px-3 text-sm focus-visible:outline-orange-500 disabled:opacity-50'
const button =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm font-medium hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-45'

export default function TeamAwardeeWorklist() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState('')
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [payment, setPayment] = useState('')
  const [assignment, setAssignment] = useState('')
  const [agent, setAgent] = useState('')
  const [year, setYear] = useState('')
  const [country, setCountry] = useState('')
  const [capacity, setCapacity] = useState('100')
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [result, setResult] = useState<Result | null>(null)
  const [revision, setRevision] = useState(0)
  const [teamRevision, setTeamRevision] = useState(0)
  const [selected, setSelected] = useState<Row | null>(null)
  const [target, setTarget] = useState('')
  const [reason, setReason] = useState('')
  const [reassignError, setReassignError] = useState<string | null>(null)
  const [reassigning, setReassigning] = useState(false)
  const busy = useRef(false)
  const initialized = useRef('')
  const selectedCountry = snapshot?.countryOptions.find(
    (option) => option.country === country,
  )
  const validCapacity =
    Number.isInteger(Number(capacity)) &&
    Number(capacity) >= 1 &&
    Number(capacity) <= 5000
  const savedCapacity = snapshot?.settings?.maxAwardeesPerAgent ?? 100
  const room =
    snapshot?.agents.reduce(
      (sum, rep) => sum + Math.max(0, Number(capacity) - rep.workload),
      0,
    ) ?? 0
  const refresh = useCallback(() => setRevision((value) => value + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/admin/team-worklist', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok)
          throw new Error(payload.message || 'Could not load teams.')
        setTeams(payload.teams ?? [])
        setTeamId(payload.teams?.[0]?.id ?? '')
        if (!payload.teams?.length) setLoading(false)
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setLoadError(error.message)
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [teamRevision])

  useEffect(() => {
    if (!teamId) return
    const controller = new AbortController()
    setLoading(true)
    const params = new URLSearchParams({
      teamId,
      page: String(page),
      search,
      payment,
      assignment,
      agent,
    })
    if (year) params.set('year', year)
    if (country) params.set('country', country)
    fetch(`/api/admin/team-worklist?${params}`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json()
        if (!response.ok)
          throw new Error(payload.message || 'Could not load the worklist.')
        if (controller.signal.aborted) return
        setSnapshot(payload)
        setLoadError(null)
        if (initialized.current !== teamId) {
          initialized.current = teamId
          setCountry(
            payload.selectedCountry ||
              payload.settings?.defaultCountry ||
              'Nigeria',
          )
          setCapacity(String(payload.settings?.maxAwardeesPerAgent ?? 100))
        }
        setYear(payload.selectedYear ? String(payload.selectedYear) : '')
        if (page > payload.pages) setPage(Math.max(payload.pages, 1))
      })
      .catch((error) => {
        if (!controller.signal.aborted) setLoadError(error.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [
    teamId,
    page,
    search,
    payment,
    assignment,
    agent,
    year,
    country,
    revision,
  ])

  useEffect(() => {
    if (!teamId) return
    const onVisible = () => {
      if (document.visibilityState === 'visible' && !busy.current) refresh()
    }
    const timer = window.setInterval(onVisible, 60_000)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [teamId, refresh])

  async function runAssignment() {
    if (busy.current || !validCapacity) return
    busy.current = true
    setWorking(true)
    setResult(null)
    try {
      const response = await fetch('/api/admin/team-worklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          year: Number(year),
          defaultCountry: country,
          maxAwardeesPerAgent: Number(capacity),
        }),
      })
      const payload = await response.json()
      if (!response.ok)
        throw new Error(payload.message || 'Distribution failed.')
      setResult(payload.result)
      setPage(1)
      refresh()
      toast.success(`${payload.result.assigned} awardees assigned.`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Distribution failed.',
      )
    } finally {
      busy.current = false
      setWorking(false)
    }
  }

  async function saveSettings() {
    if (busy.current || !validCapacity) return
    busy.current = true
    setSaving(true)
    try {
      const response = await fetch('/api/admin/team-worklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          defaultCountry: country,
          maxAwardeesPerAgent: Number(capacity),
        }),
      })
      const payload = await response.json()
      if (!response.ok)
        throw new Error(payload.message || 'Could not save settings.')
      setSnapshot((current) =>
        current ? { ...current, settings: payload.settings } : current,
      )
      toast.success('Country and rep capacity saved.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Could not save settings.',
      )
    } finally {
      busy.current = false
      setSaving(false)
    }
  }

  async function reassign(event: React.FormEvent) {
    event.preventDefault()
    if (!selected || busy.current) return
    busy.current = true
    setReassigning(true)
    setReassignError(null)
    try {
      const response = await fetch('/api/admin/team-worklist/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          awardeeId: selected.id,
          agentId: target,
          reason,
        }),
      })
      const payload = await response.json()
      if (!response.ok)
        throw new Error(payload.message || 'Could not update assignment.')
      toast.success('Assignment updated. History is preserved.')
      setSelected(null)
      refresh()
    } catch (error) {
      setReassignError(
        error instanceof Error ? error.message : 'Could not update assignment.',
      )
    } finally {
      busy.current = false
      setReassigning(false)
    }
  }

  function owner(row: Row) {
    return (
      <div className="space-y-1.5">
        <p className={row.agent_id ? 'text-zinc-800' : 'text-zinc-500'}>
          {row.agent_name || 'Unassigned'}
        </p>
        <button
          disabled={
            working ||
            saving ||
            loading ||
            snapshot?.repairRequired ||
            !snapshot?.agents.length
          }
          className="min-h-11 text-xs font-medium text-orange-700 hover:underline disabled:opacity-40"
          onClick={() => {
            setSelected(row)
            setTarget('')
            setReason('')
            setReassignError(null)
          }}
        >
          {row.agent_id ? 'Change rep' : 'Assign rep'}
        </button>
      </div>
    )
  }
  function paid(row: Row) {
    return row.payment_status === 'paid' &&
      row.payment_source_id &&
      row.payment_verified_at ? (
      <span className="inline-flex items-center gap-1.5 text-sm text-emerald-800">
        <CheckCircle2 className="h-4 w-4" />
        Verified paid
      </span>
    ) : (
      <span className="text-sm capitalize text-zinc-600">
        {row.payment_status === 'paid'
          ? 'Verification needed'
          : row.payment_status}
      </span>
    )
  }
  function contacts(row: Row) {
    return (
      <div className="flex flex-wrap gap-2">
        {row.phone ? (
          <a
            href={`tel:${row.phone}`}
            className={button}
            aria-label={`Call ${row.name}`}
          >
            <Phone className="h-4 w-4" />
            <span className="md:sr-only">Call</span>
          </a>
        ) : null}
        {row.email ? (
          <a
            href={`mailto:${row.email}`}
            className={button}
            aria-label={`Email ${row.name}`}
          >
            <Mail className="h-4 w-4" />
            <span className="md:sr-only">Email</span>
          </a>
        ) : null}
        {!row.phone && !row.email ? (
          <span className="text-xs text-zinc-500">No contact details</span>
        ) : null}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-orange-700">
            Team operations
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Awardee worklist
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">
            Give every awardee one rep. Distribute unassigned work, track
            ownership, and keep follow-ups moving.
          </p>
        </div>
        {teams.length > 1 ? (
          <label className="grid gap-1.5 text-xs text-zinc-600">
            Team
            <select
              disabled={working || saving || reassigning}
              className={control}
              value={teamId}
              onChange={(event) => {
                setSnapshot(null)
                setYear('')
                setCountry('')
                setPage(1)
                setAgent('')
                setResult(null)
                setTeamId(event.target.value)
              }}
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        ) : teams[0] ? (
          <span className="inline-flex items-center gap-2 text-sm text-zinc-600">
            <Users className="h-4 w-4" />
            {teams[0].name}
          </span>
        ) : null}
      </header>
      {loadError ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <span>{loadError}</span>
          <button
            className={button}
            onClick={() =>
              teamId ? refresh() : setTeamRevision((value) => value + 1)
            }
          >
            Retry
          </button>
        </div>
      ) : null}
      {!loading && !teams.length && !loadError ? (
        <p className="rounded-2xl border bg-white p-8 text-sm text-zinc-600">
          No active sales team is available. Activate a team in Team Operations
          first.
        </p>
      ) : null}
      {snapshot?.repairRequired ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
        >
          Distribution is unavailable until the worklist database update is
          installed. The update resolves duplicate records and competing
          assignments while preserving history.
        </p>
      ) : null}
      <section className="rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="mb-5">
          <h2 className="text-base font-semibold">Distribute awardees</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Choose a pool and a capacity. Existing assignments stay with their
            reps.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_auto]">
          <label className="grid gap-1.5 text-sm text-zinc-700">
            Award year
            <select
              disabled={working || saving}
              className={control}
              value={year}
              onChange={(event) => {
                setPage(1)
                setYear(event.target.value)
                setResult(null)
              }}
            >
              <option value="">Choose year</option>
              {snapshot?.years.map((option) => (
                <option key={option.year} value={option.year}>
                  {option.year} · {option.unpaid.toLocaleString()} unpaid
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-zinc-700">
            Country
            <select
              disabled={working || saving}
              className={control}
              value={country}
              onChange={(event) => {
                setPage(1)
                setCountry(event.target.value)
                setResult(null)
              }}
            >
              {snapshot?.countryOptions.map((option) => (
                <option key={option.country} value={option.country}>
                  {option.country} · {option.unpaid.toLocaleString()} unpaid
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1.5 text-sm text-zinc-700">
            Active awardees per rep
            <input
              disabled={working || saving}
              className={control}
              type="number"
              min={1}
              max={5000}
              step={1}
              value={capacity}
              onChange={(event) => setCapacity(event.target.value)}
            />
          </label>
          <button
            onClick={() => void runAssignment()}
            disabled={
              working ||
              saving ||
              reassigning ||
              loading ||
              Boolean(loadError) ||
              !teamId ||
              !year ||
              !snapshot?.autoAssignEnabled ||
              snapshot?.repairRequired ||
              !selectedCountry?.unpaid ||
              !validCapacity ||
              !snapshot?.agents.length ||
              !room
            }
            className="inline-flex min-h-11 items-center justify-center gap-2 self-end rounded-xl bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {working ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Shuffle className="h-4 w-4" />
            )}
            {working ? 'Distributing…' : 'Distribute unassigned'}
          </button>
        </div>
        <p className="mt-3 text-xs leading-5 text-zinc-500">
          {!validCapacity
            ? 'Enter a whole number from 1 to 5,000.'
            : !snapshot?.agents.length
              ? 'Activate a sales rep in Team Operations to distribute work.'
              : !snapshot.autoAssignEnabled
                ? 'Assignment is paused in team settings.'
                : `${selectedCountry?.unpaid.toLocaleString() ?? 0} unpaid in this pool · ${room.toLocaleString()} open places across ${snapshot.agents.length} reps. Paid, pending and refunded awardees are excluded.`}
        </p>
        <button
          className={`${button} mt-3`}
          disabled={
            saving ||
            working ||
            reassigning ||
            loading ||
            !teamId ||
            !country ||
            !validCapacity
          }
          onClick={() => void saveSettings()}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? 'Saving…' : 'Save country & capacity'}
        </button>
        {snapshot?.agents.length ? (
          <div className="mt-5 grid gap-3 border-t border-zinc-100 pt-4 sm:grid-cols-2 xl:grid-cols-4">
            {snapshot.agents.map((rep) => (
              <div key={rep.id} className="min-w-0">
                <div className="mb-2 flex justify-between gap-2 text-xs">
                  <span
                    className="truncate text-zinc-700"
                    title={rep.full_name}
                  >
                    {rep.full_name}
                  </span>
                  <span
                    className={`shrink-0 tabular-nums ${rep.workload >= Number(capacity) ? 'text-amber-800' : 'text-zinc-500'}`}
                  >
                    {rep.workload} / {capacity || '—'}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100">
                  <div
                    className={
                      rep.workload >= Number(capacity)
                        ? 'h-full bg-amber-500'
                        : 'h-full bg-orange-500'
                    }
                    style={{
                      width: `${Math.min(100, (rep.workload / Math.max(1, Number(capacity))) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </section>
      {result ? (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"
        >
          <strong className="font-medium">
            {result.assigned} assigned in {result.country}, {result.year}.
          </strong>{' '}
          {result.loaded} new awardees added to the worklist.
          {result.capacity_skipped
            ? ` ${result.capacity_skipped} remain unassigned because reps are at capacity.`
            : ''}
          {!result.assigned && !result.loaded
            ? ' Existing work is already loaded; no records were duplicated.'
            : ''}
        </div>
      ) : null}
      {snapshot?.summary && !loading && !loadError ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['In this pool', snapshot.summary.total],
            ['Assigned', snapshot.summary.assigned],
            ['Awaiting a rep', snapshot.summary.unassigned],
            ['Verified paid', snapshot.summary.paid],
          ].map(([label, value]) => (
            <div key={label} className="border-l-2 border-zinc-200 pl-4">
              <p className="text-xs text-zinc-500">{label}</p>
              <p className="mt-1 text-2xl font-medium tabular-nums">
                {Number(value).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      ) : null}
      <section
        className="overflow-hidden rounded-2xl border border-zinc-200 bg-white"
        aria-busy={loading}
      >
        <div className="space-y-3 border-b border-zinc-100 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">
              Awardees{' '}
              <span className="ml-1 text-xs font-normal text-zinc-500">
                {!loading && !loadError ? snapshot?.total.toLocaleString() ?? '—' : '—'} matching
              </span>
            </h2>
            <button
              className={button}
              disabled={loading || working}
              onClick={refresh}
              aria-label="Refresh worklist"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
              />
            </button>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setSearch(searchInput.trim())
              setPage(1)
            }}
            className="flex flex-wrap gap-2"
          >
            <div className="flex min-w-0 flex-1 basis-56 gap-2">
              <input
                aria-label="Search awardees"
                className={`${control} w-full`}
                placeholder="Search name, email, phone…"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
              <button className={button} type="submit" aria-label="Search">
                <Search className="h-4 w-4" />
              </button>
            </div>
            <select
              aria-label="Payment status"
              className={control}
              value={payment}
              onChange={(event) => {
                setPayment(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All payments</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
              <option value="pending">Pending</option>
              <option value="refunded">Refunded</option>
            </select>
            <select
              aria-label="Assignment status"
              className={control}
              value={assignment}
              onChange={(event) => {
                setAssignment(event.target.value)
                setPage(1)
              }}
            >
              <option value="">Any assignment</option>
              <option value="assigned">Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
            <select
              aria-label="Sales rep"
              className={control}
              value={agent}
              onChange={(event) => {
                setAgent(event.target.value)
                setPage(1)
              }}
            >
              <option value="">All reps</option>
              {snapshot?.agents.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.full_name}
                </option>
              ))}
            </select>
            {search || payment || assignment || agent ? (
              <button
                className={button}
                type="button"
                onClick={() => {
                  setSearch('')
                  setSearchInput('')
                  setPayment('')
                  setAssignment('')
                  setAgent('')
                  setPage(1)
                }}
              >
                Clear filters
              </button>
            ) : null}
          </form>
        </div>
        {loading ? (
          <div className="flex justify-center gap-2 p-12 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading worklist…
          </div>
        ) : loadError ? (
          <p className="p-10 text-center text-sm text-zinc-500">
            The worklist is unavailable. Retry above.
          </p>
        ) : snapshot?.rows.length ? (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs text-zinc-500">
                  <tr>
                    {[
                      'Awardee',
                      'Contact details',
                      'Payment',
                      'Sales rep',
                      'Contact',
                    ].map((label) => (
                      <th key={label} className="px-4 py-3 font-medium">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {snapshot.rows.map((row) => (
                    <tr key={row.id}>
                      <td className="max-w-64 px-4 py-4">
                        <p className="font-medium">{row.name}</p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {row.country || 'Country unavailable'} ·{' '}
                          {row.contact_status?.replaceAll('_', ' ')}
                        </p>
                        {row.address ? (
                          <p className="mt-1 text-xs text-zinc-500">
                            {row.address}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-4">
                        <p className="break-all text-xs">
                          {row.email || 'No email'}
                        </p>
                        <p className="mt-1 text-xs text-zinc-500">
                          {row.phone || 'No phone'}
                        </p>
                      </td>
                      <td className="px-4 py-4">{paid(row)}</td>
                      <td className="px-4 py-4">{owner(row)}</td>
                      <td className="px-4 py-4">{contacts(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-zinc-100 md:hidden">
              {snapshot.rows.map((row) => (
                <article key={row.id} className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-medium">{row.name}</h3>
                      <p className="mt-1 text-xs text-zinc-500">
                        {row.country} ·{' '}
                        {row.contact_status?.replaceAll('_', ' ')}
                      </p>
                    </div>
                    {paid(row)}
                  </div>
                  <p className="break-all text-sm text-zinc-600">
                    {row.email || 'No email'}
                    <br />
                    {row.phone || 'No phone'}
                  </p>
                  {row.address ? (
                    <p className="text-xs text-zinc-500">{row.address}</p>
                  ) : null}
                  <div className="flex items-center justify-between gap-3">
                    {owner(row)}
                    {contacts(row)}
                  </div>
                </article>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 p-4 text-xs text-zinc-500">
              <span>
                Page {page} of {snapshot.pages}
              </span>
              <div className="flex gap-2">
                <button
                  className={button}
                  disabled={page <= 1}
                  onClick={() => setPage((value) => value - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  className={button}
                  disabled={page >= snapshot.pages}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="p-12 text-center">
            <p className="text-sm font-medium">
              {search || payment || assignment || agent
                ? 'No matching awardees'
                : 'This pool has no worklist yet'}
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              {search || payment || assignment || agent
                ? 'Clear a filter or try a different search.'
                : 'Choose a year and country, then distribute unpaid awardees to your reps.'}
            </p>
          </div>
        )}
      </section>
      <Dialog
        open={Boolean(selected)}
        onOpenChange={(open) => {
          if (!open && !reassigning) setSelected(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.agent_id ? 'Change sales rep' : 'Assign sales rep'}
            </DialogTitle>
            <DialogDescription>
              {selected?.name} · Current rep:{' '}
              {selected?.agent_name || 'Unassigned'}. Payment and contact
              history stay with the original records.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => void reassign(event)}
          >
            {reassignError ? (
              <p role="alert" className="text-sm text-red-700">
                {reassignError}
              </p>
            ) : null}
            <label className="grid gap-1.5 text-sm">
              New sales rep
              <select
                className={control}
                required
                disabled={reassigning}
                value={target}
                onChange={(event) => setTarget(event.target.value)}
              >
                <option value="">Choose rep</option>
                {snapshot?.agents.map((rep) => (
                  <option
                    key={rep.id}
                    value={rep.id}
                    disabled={
                      rep.id === selected?.agent_id ||
                      rep.workload >= savedCapacity
                    }
                  >
                    {rep.full_name} · {rep.workload}/{savedCapacity}
                    {rep.workload >= savedCapacity ? ' · full' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1.5 text-sm">
              Reason
              <input
                className={control}
                required
                minLength={3}
                maxLength={500}
                value={reason}
                disabled={reassigning}
                onChange={(event) => setReason(event.target.value)}
                placeholder="e.g. Covering a colleague’s leave"
              />
            </label>
            <button
              className={`${button} w-full bg-zinc-900 text-white hover:bg-zinc-800`}
              disabled={reassigning || !target || reason.trim().length < 3}
            >
              {reassigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {reassigning ? 'Updating…' : 'Update assignment'}
            </button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
