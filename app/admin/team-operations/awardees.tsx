'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { CheckCircle2, ChevronLeft, ChevronRight, Filter, Loader2, Mail, Phone, Save, Shuffle } from 'lucide-react'
import { toast } from 'sonner'

type Team = { id: string; name: string }
type Row = { id: string; name: string; country: string | null; phone: string | null; email: string | null; address: string | null; payment_status: string; payment_source_id: string | null; payment_verified_at: string | null }
type YearOption = { year: number; total: number; unpaid: number }
type CountryOption = { country: string; total: number; unpaid: number }

export default function TeamAwardeeWorklist() {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamId, setTeamId] = useState('')
  const [rows, setRows] = useState<Row[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [payment, setPayment] = useState('')
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string; email: string; workload: number }>>([])
  const [autoEnabled, setAutoEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [years, setYears] = useState<YearOption[]>([])
  const [countryOptions, setCountryOptions] = useState<CountryOption[]>([])
  const [year, setYear] = useState('')
  const [country, setCountry] = useState('Nigeria')
  const [capacity, setCapacity] = useState('100')
  const [savingSettings, setSavingSettings] = useState(false)
  const configuredTeam = useRef('')
  const selectedYear = years.find((option) => String(option.year) === year)
  const selectedCountry = countryOptions.find((option) => option.country === country)

  const load = useCallback(async (nextPage = 1, currentSearch = search, currentPayment = payment, currentYear = year, currentCountry = country, silent = false) => {
    if (!teamId) return
    if (!silent) setLoading(true)
    try {
      const params = new URLSearchParams({ teamId, page: String(nextPage) })
      if (currentYear) params.set('year', currentYear)
      if (currentSearch) params.set('search', currentSearch)
      if (currentPayment) params.set('payment', currentPayment)
      if (currentCountry) params.set('country', currentCountry)
      const response = await fetch(`/api/admin/team-worklist?${params}`, { cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not load awardees.')
      setLoadError(null)
      setRows(payload.rows ?? []); setTotal(payload.total ?? 0); setPage(payload.page ?? nextPage); setPages(payload.pages ?? 1)
      setAgents(payload.agents ?? []); setAutoEnabled(Boolean(payload.autoAssignEnabled)); setYears(payload.years ?? [])
      setCountryOptions(payload.countryOptions ?? [])
      if (configuredTeam.current !== teamId) {
        configuredTeam.current = teamId
        setCountry(payload.settings?.defaultCountry || 'Nigeria')
        setCapacity(String(payload.settings?.maxAwardeesPerAgent ?? 100))
      }
      const resolvedYear = payload.selectedYear ? String(payload.selectedYear) : ''
      setYear((current) => current === resolvedYear ? current : resolvedYear)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not load awardees.'
      setLoadError(message)
      if (!silent) toast.error(message)
    } finally { if (!silent) setLoading(false) }
  }, [teamId, search, payment, year, country])

  useEffect(() => {
    let cancelled = false
    fetch('/api/admin/team-worklist', { cache: 'no-store' }).then(async (response) => {
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not load teams.')
      if (!cancelled) { setLoadError(null); setTeams(payload.teams ?? []); setTeamId((current) => current || payload.teams?.[0]?.id || '') }
    }).catch((error) => {
      const message = error instanceof Error ? error.message : 'Could not load teams.'
      if (!cancelled) setLoadError(message)
      toast.error(message)
    })
    return () => { cancelled = true }
  }, [])

  useEffect(() => { if (teamId) void load(1, search, payment, year) }, [teamId, search, payment, year, load])

  useEffect(() => {
    if (!teamId || !year) return
    const refresh = () => {
      if (document.visibilityState === 'visible' && !working) {
        void load(page, search, payment, year, country, true)
      }
    }
    const interval = window.setInterval(refresh, 30_000)
    document.addEventListener('visibilitychange', refresh)
    return () => {
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refresh)
    }
  }, [teamId, year, page, search, payment, working, load])

  async function runAssignment() {
    setWorking(true)
    try {
      const settingResponse = await fetch('/api/admin/team-worklist', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, defaultCountry: country, maxAwardeesPerAgent: Number(capacity) }),
      })
      const settingPayload = await settingResponse.json()
      if (!settingResponse.ok) throw new Error(settingPayload.message || 'Could not save worklist settings.')
      const response = await fetch('/api/admin/team-worklist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ teamId, year: Number(year) }) })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Assignment run failed.')
      const result = payload.result
      toast.success(`${result.loaded} new ${result.country} rows added from Top100’s ${result.year} list; ${result.assigned} unpaid awardees assigned${result.capacity_skipped ? ` · ${result.capacity_skipped} remain for reps at capacity` : ''}.`)
      await load(1, search, payment, year, country)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Assignment run failed.') }
    finally { setWorking(false) }
  }

  async function saveSettings() {
    setSavingSettings(true)
    try {
      const response = await fetch('/api/admin/team-worklist', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, defaultCountry: country, maxAwardeesPerAgent: Number(capacity) }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.message || 'Could not save worklist settings.')
      toast.success('Worklist settings saved.')
      await load(1, search, payment, year, country)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save worklist settings.')
    } finally { setSavingSettings(false) }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">Team operations</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Awardee worklist</h1><p className="mt-2 max-w-2xl text-sm text-zinc-600">Choose a year to pull unpaid awardees from the existing Top100 list, then shuffle them across available reps.</p></div>
        {teams.length > 1 ? <label className="grid gap-1 text-xs font-medium text-zinc-600">Team<select className="h-10 min-w-48 rounded-xl border border-zinc-200 bg-white px-3 text-sm" value={teamId} onChange={(event) => setTeamId(event.target.value)}>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label> : teams[0] ? <span className="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm">{teams[0].name}</span> : null}
      </header>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <label className="grid min-w-48 gap-1.5 text-sm font-medium text-zinc-700">Award year<select className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm" value={year} onChange={(event) => { setPage(1); setYear(event.target.value) }}><option value="">Choose a year</option>{years.map((option) => <option key={option.year} value={option.year}>{option.year} · {option.unpaid.toLocaleString()} unpaid of {option.total.toLocaleString()}</option>)}</select></label>
          <label className="grid min-w-48 gap-1.5 text-sm font-medium text-zinc-700">Country focus<select className="h-11 rounded-xl border border-zinc-200 bg-white px-3 text-sm" value={country} onChange={(event) => { setPage(1); setCountry(event.target.value) }}>{countryOptions.map((option) => <option key={option.country} value={option.country}>{option.country}{option.country === 'Nigeria' ? ' · default' : ''} · {option.unpaid.toLocaleString()} unpaid</option>)}</select></label>
          <label className="grid w-48 gap-1.5 text-sm font-medium text-zinc-700">Max active awardees per rep<input className="h-11 rounded-xl border border-zinc-200 px-3 text-sm" type="number" min={1} max={5000} step={1} value={capacity} onChange={(event) => setCapacity(event.target.value)} /></label>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void saveSettings()} disabled={savingSettings || working || !teamId || !country || !Number.isInteger(Number(capacity)) || Number(capacity) < 1 || Number(capacity) > 5000} className="inline-flex h-11 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm font-semibold text-zinc-800 disabled:opacity-45">{savingSettings ? <Loader2 className="h-4 w-4 animate-spin"/> : <Save className="h-4 w-4"/>}Save settings</button>
            <button onClick={() => void runAssignment()} disabled={working || savingSettings || loading || !teamId || !year || !autoEnabled || !selectedCountry?.unpaid} className="inline-flex h-11 items-center gap-2 rounded-xl bg-zinc-900 px-4 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-45">{working ? <Loader2 className="h-4 w-4 animate-spin"/> : <Shuffle className="h-4 w-4"/>}{agents.length ? `Load & shuffle unpaid from ${year || 'year'}` : `Load unpaid from ${year || 'year'}`}</button>
          </div>
        </div>
        {loadError ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{loadError}</p> : null}
        {!loading && !loadError && !years.length ? <p className="text-sm text-zinc-600">No award years were found in the Top100 awardee list.</p> : null}
        {!autoEnabled ? <p className="text-sm text-amber-800">Automatic assignment is paused in team settings.</p> : !agents.length ? <p className="text-sm text-amber-800">No active sales reps yet. You can load this year’s unpaid list now; assignment will begin once reps are active.</p> : null}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
          <p className="text-sm text-zinc-600">{selectedCountry?.unpaid.toLocaleString() ?? 0} unpaid awardees in {country}, {year || 'selected year'}. Paid, pending, and refunded orders are skipped.</p>
          <p className="text-xs text-zinc-500">Up to {Number(capacity) || 0} active awardees per rep</p>
        </div>
        <div className="flex flex-wrap gap-2">{agents.map((agent) => <span key={agent.id} className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700">{agent.full_name} <strong className={agent.workload >= Number(capacity) ? 'text-amber-800' : ''}>{agent.workload}/{Number(capacity) || 0}</strong></span>)}</div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 p-4">
          <div><h2 className="font-semibold">Awardees <span className="ml-1 text-xs font-normal text-zinc-500">{total.toLocaleString()}</span></h2><p className="mt-1 text-xs text-zinc-500">Payment status is updated from verified award orders.</p></div>
          <div className="flex flex-wrap gap-2"><input className="h-10 rounded-xl border border-zinc-200 px-3 text-sm" placeholder="Search name, email, phone or address" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setSearch(searchInput) } }}/><button onClick={() => { setSearch(searchInput); setPage(1) }} className="inline-flex h-10 items-center gap-2 rounded-xl border border-zinc-200 px-3 text-sm"><Filter className="h-4 w-4"/>Search</button><select className="h-10 rounded-xl border border-zinc-200 bg-white px-3 text-sm" value={payment} onChange={(event) => setPayment(event.target.value)}><option value="">All payment states</option><option value="paid">Verified</option><option value="unpaid">Unpaid</option><option value="pending">Pending</option><option value="refunded">Refunded</option></select></div>
        </div>
        {loading ? <div className="p-12 text-center text-sm text-zinc-500">Loading awardees…</div> : rows.length ? <>
          <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-zinc-50 text-xs text-zinc-500"><tr>{['Name','Country','Phone','Email','Address','Payment','Contact'].map((label) => <th key={label} className="px-4 py-3 font-medium">{label}</th>)}</tr></thead><tbody className="divide-y divide-zinc-100">{rows.map((row) => {
            const paymentVerified = row.payment_status === 'paid' && Boolean(row.payment_source_id && row.payment_verified_at)
            return <tr key={row.id} className={paymentVerified ? 'bg-emerald-50/60' : undefined}>
              <td className="max-w-56 px-4 py-3 font-medium">{row.name}</td>
              <td className="px-4 py-3">{row.country || '—'}</td>
              <td className="whitespace-nowrap px-4 py-3">{row.phone || '—'}</td>
              <td className="px-4 py-3">{row.email || '—'}</td>
              <td className="max-w-64 whitespace-normal px-4 py-3 text-zinc-600">{row.address || '—'}</td>
              <td className="whitespace-nowrap px-4 py-3">{paymentVerified ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800"><CheckCircle2 className="h-4 w-4"/>Paid</span> : <span className="text-zinc-600">{row.payment_status === 'paid' ? 'Payment link needed' : row.payment_status}</span>}</td>
              <td className="px-4 py-3"><div className="flex items-center gap-1.5">
                {row.email ? <a href={`mailto:${row.email}`} aria-label={`Email ${row.name}`} title={`Email ${row.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"><Mail className="h-4 w-4"/></a> : null}
                {row.phone ? <a href={`tel:${row.phone}`} aria-label={`Call ${row.name}`} title={`Call ${row.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-50"><Phone className="h-4 w-4"/></a> : null}
                {!row.email && !row.phone ? <span className="text-xs text-zinc-500">No contact details</span> : null}
              </div></td>
            </tr>
          })}</tbody></table></div>
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs"><span>Page {page} of {pages}</span><div className="flex gap-2"><button disabled={page <= 1} onClick={() => { const next = page - 1; setPage(next); void load(next) }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 px-2 disabled:opacity-40"><ChevronLeft className="h-4 w-4"/>Previous</button><button disabled={page >= pages} onClick={() => { const next = page + 1; setPage(next); void load(next) }} className="inline-flex h-8 items-center gap-1 rounded-lg border border-zinc-200 px-2 disabled:opacity-40">Next<ChevronRight className="h-4 w-4"/></button></div></div>
        </> : <div className="p-12 text-center text-sm text-zinc-500">{loadError ? 'The awardee list could not be loaded.' : year ? `No awardees from ${year} match these filters yet.` : 'Choose an award year to view its worklist.'}</div>}
      </section>
    </div>
  )
}
