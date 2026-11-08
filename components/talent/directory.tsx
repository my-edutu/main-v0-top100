'use client'

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import Image from '@/components/safe-image'
import { ArrowRight, Search, SlidersHorizontal, Users, X } from 'lucide-react'
import { TALENT_INTERESTS, TALENT_SECTORS, TALENT_WORK_MODES } from '@/lib/talent/contracts'
import type { TalentCard, TalentPage } from '@/lib/talent/types'
import { Field, inputClass, primaryClass, secondaryClass, TalentNotice } from './ui'

const initialFilters = { q: '', sector: '', skill: '', country: '', interest: '', language: '', workMode: '', year: '' }
type Filters = typeof initialFilters

export function TalentDirectory({ archive, compact = false }: { archive?: ReactNode; compact?: boolean }) {
  const hasArchive = Boolean(archive)
  const Heading = compact ? 'h2' : 'h1'
  const [view, setView] = useState<'talent' | 'archive'>('talent')
  const [filters, setFilters] = useState<Filters>(initialFilters)
  const [applied, setApplied] = useState<Filters>(initialFilters)
  const [more, setMore] = useState(false)
  const [page, setPage] = useState<TalentPage>({ people: [], nextCursor: null, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(false)
  const [reload, setReload] = useState(0)
  const generation = useRef(0)
  const query = useMemo(() => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(applied)) if (value.trim()) params.set(key, value.trim())
    return params.toString()
  }, [applied])

  useEffect(() => {
    if (view !== 'talent') return
    const controller = new AbortController()
    const current = ++generation.current
    setLoading(true); setLoadingMore(false); setError(''); setPage({ people: [], nextCursor: null, total: 0 })
    fetch(`/api/talent?${query}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (response.status === 404 && hasArchive) { setDisabled(true); setView('archive'); return null }
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'We could not load the talent directory.')
      return data as TalentPage
    }).then(data => { if (data && generation.current === current) setPage(data) }).catch(reason => {
      if (reason.name !== 'AbortError' && generation.current === current) setError(reason.message)
    }).finally(() => { if (!controller.signal.aborted && generation.current === current) setLoading(false) })
    return () => controller.abort()
  }, [query, view, reload, hasArchive])

  async function loadMore() {
    if (!page.nextCursor || loadingMore) return
    const current = generation.current
    setLoadingMore(true); setError('')
    try {
      const response = await fetch(`/api/talent?${query}&cursor=${encodeURIComponent(page.nextCursor)}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Could not load more profiles.')
      if (generation.current === current) setPage(previous => ({ ...data, people: [...previous.people, ...data.people.filter((person: TalentCard) => !previous.people.some(old => old.id === person.id))] }))
    } catch (reason) { if (generation.current === current) setError(reason instanceof Error ? reason.message : 'Could not load more profiles.') }
    finally { if (generation.current === current) setLoadingMore(false) }
  }
  const change = (key: keyof Filters, value: string) => setFilters(previous => ({ ...previous, [key]: value }))
  const activeFilters = Object.values(applied).filter(Boolean).length
  if (disabled && archive) return <>{archive}</>

  return <section className={compact ? 'space-y-6' : 'mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8'} aria-label="Top100 talent network">
    {archive && <div className="mb-8 flex w-fit max-w-full gap-1 rounded-2xl border border-orange-200 bg-orange-50 p-1" aria-label="Directory view">
      <button type="button" onClick={() => setView('talent')} aria-pressed={view === 'talent'} className={`min-h-11 rounded-xl px-4 text-sm font-semibold focus-visible:outline-orange-700 ${view === 'talent' ? 'bg-gradient-to-r from-orange-700 to-amber-700 text-white' : 'text-stone-700'}`}>Discover talent</button>
      <button type="button" onClick={() => setView('archive')} aria-pressed={view === 'archive'} className={`min-h-11 rounded-xl px-4 text-sm font-semibold focus-visible:outline-orange-700 ${view === 'archive' ? 'bg-gradient-to-r from-orange-700 to-amber-700 text-white' : 'text-stone-700'}`}>Awardee archive</button>
    </div>}
    {view === 'archive' ? archive : <>
      <header className="mb-8 grid gap-6 rounded-[28px] border border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-6 sm:p-9 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-2xl"><p className="text-xs font-semibold uppercase tracking-[.2em] text-orange-800">Impact Beyond Recognition</p>
          <Heading className="mt-3 text-3xl font-semibold tracking-tight text-stone-950 sm:text-5xl">Talent worth getting to know.</Heading>
          <p className="mt-4 max-w-xl text-base leading-7 text-stone-600">Meet Top100 members who have chosen to share their skills, work and ambitions. Find a relevant profile, then tell us about your opportunity.</p>
        </div>
        <Link href="/for-organisations/request" className={`${primaryClass} w-fit`}>Tell us who you need <ArrowRight className="size-4" aria-hidden="true" /></Link>
      </header>
      <form className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 sm:p-5" onSubmit={event => { event.preventDefault(); setApplied({ ...filters }) }}>
        <div className="flex flex-col gap-3 sm:flex-row"><div className="min-w-0 flex-1"><label htmlFor="talent-search" className="sr-only">Search talent by name, skills or work</label><div className="relative"><Search className="absolute left-3 top-3 size-5 text-stone-400" aria-hidden="true" /><input id="talent-search" value={filters.q} maxLength={100} onChange={event => change('q', event.target.value)} placeholder="Name, skills, projects or interests" className={`${inputClass} pl-11`} /></div></div><button className={primaryClass} type="submit">Search talent</button></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Sector" htmlFor="talent-sector"><select id="talent-sector" className={inputClass} value={filters.sector} onChange={event => change('sector', event.target.value)}><option value="">All sectors</option>{TALENT_SECTORS.map(item => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Skill" htmlFor="talent-skill"><input id="talent-skill" className={inputClass} value={filters.skill} maxLength={80} onChange={event => change('skill', event.target.value)} placeholder="e.g. Python" /></Field>
          <Field label="Country of residence" htmlFor="talent-country"><input id="talent-country" className={inputClass} value={filters.country} maxLength={100} onChange={event => change('country', event.target.value)} placeholder="Any country" /></Field>
          <Field label="Interested in" htmlFor="talent-interest"><select id="talent-interest" className={inputClass} value={filters.interest} onChange={event => change('interest', event.target.value)}><option value="">Any opportunity</option>{TALENT_INTERESTS.map(item => <option key={item}>{item}</option>)}</select></Field>
        </div>
        <div className="flex flex-wrap items-center gap-3"><button type="button" className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-stone-700" onClick={() => setMore(!more)} aria-expanded={more} aria-controls="talent-extra-filters"><SlidersHorizontal className="size-4" aria-hidden="true" />{more ? 'Fewer filters' : 'More filters'}</button>{activeFilters > 0 && <button type="button" className="inline-flex min-h-11 items-center gap-1 text-sm text-orange-800" onClick={() => { setFilters(initialFilters); setApplied(initialFilters) }}><X className="size-4" aria-hidden="true" />Clear filters ({activeFilters})</button>}<span className="text-xs text-stone-500">Choose your filters, then select Search talent.</span></div>
        {more && <div id="talent-extra-filters" className="grid gap-3 border-t border-stone-100 pt-4 sm:grid-cols-3">
          <Field label="Language" htmlFor="talent-language"><input id="talent-language" className={inputClass} value={filters.language} maxLength={80} onChange={event => change('language', event.target.value)} placeholder="Any language" /></Field>
          <Field label="Work preference" htmlFor="talent-work"><select id="talent-work" className={inputClass} value={filters.workMode} onChange={event => change('workMode', event.target.value)}><option value="">Any preference</option>{TALENT_WORK_MODES.map(item => <option key={item}>{item}</option>)}</select></Field>
          <Field label="Recognition year" htmlFor="talent-year" hint="Leave empty to include every cohort."><input id="talent-year" inputMode="numeric" pattern="[0-9]{4}" maxLength={4} className={inputClass} value={filters.year} onChange={event => change('year', event.target.value)} placeholder="All years" /></Field>
        </div>}
      </form>
      <div className="my-5 flex flex-wrap items-center justify-between gap-2"><p aria-live="polite" className="text-sm text-stone-600">{loading ? 'Finding profiles…' : `${page.total} matching ${page.total === 1 ? 'profile' : 'profiles'}`}</p><p className="text-xs text-stone-500">Profile information is self-reported unless a specific check is shown.</p></div>
      {error && <div className="mb-5"><TalentNotice kind="error">{error} <button type="button" className="min-h-11 underline" onClick={() => setReload(value => value + 1)}>Retry</button></TalentNotice></div>}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading talent profiles" aria-busy="true">{[0,1,2,3,4,5].map(item => <div key={item} className="h-64 animate-pulse rounded-2xl border border-stone-100 bg-stone-50 motion-reduce:animate-none" />)}</div>
        : page.people.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{page.people.map(person => <TalentCardView key={person.id} person={person} />)}</div>
        : !error && <div className="rounded-2xl border border-dashed border-orange-200 bg-orange-50/40 px-6 py-12 text-center"><Users className="mx-auto size-9 text-orange-700" aria-hidden="true" /><h2 className="mt-4 text-xl font-semibold text-stone-950">{activeFilters ? 'No profiles match yet.' : 'The talent network starts with its members.'}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-stone-600">{activeFilters ? 'Try fewer filters, or send us a specific brief. We will review it without promising a match.' : 'Members can complete their talent details and choose to join discovery. The awardee archive remains available.'}</p><Link className={`${secondaryClass} mt-5`} href={activeFilters ? '/for-organisations/request' : '/dashboard/me/profile'}>{activeFilters ? 'Submit your brief' : 'Complete your talent profile'}</Link></div>}
      {page.nextCursor && !loading && <div className="mt-8 text-center"><button type="button" disabled={loadingMore} className={secondaryClass} onClick={loadMore}>{loadingMore ? 'Loading…' : 'Show more talent'}</button></div>}
    </>}
  </section>
}
function TalentCardView({ person }: { person: TalentCard }) {
  return <article className="flex flex-col rounded-[24px] border border-stone-200 bg-white p-5 transition-colors hover:border-orange-300">
    <div className="flex items-start gap-3"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-orange-100 text-lg font-semibold text-orange-900">{person.avatarUrl ? <Image src={person.avatarUrl} alt="" width={56} height={56} className="size-14 object-cover" /> : person.name.split(' ').filter(Boolean).slice(0,2).map(word => word[0]).join('')}</div><div className="min-w-0"><h2 className="break-words font-semibold text-stone-950"><Link className="hover:underline focus-visible:outline-orange-700" href={`/awardees/${encodeURIComponent(person.slug)}#talent-portfolio`}>{person.name}</Link></h2><p className="mt-1 text-xs text-stone-500">{[person.country, person.year ? `Top100 ${person.year}` : ''].filter(Boolean).join(' · ')}</p></div></div>
    <p className="mt-4 text-base font-medium leading-6 text-stone-800">{person.headline}</p><p className="mt-1 text-sm text-orange-800">{person.sector}</p>
    <div className="mt-4 flex flex-wrap gap-2">{person.skills.map(skill => <span key={skill} className="rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">{skill}</span>)}</div>
    <div className="mt-5 border-t border-stone-100 pt-4"><p className="text-xs text-stone-500">Interested in</p><p className="mt-1 text-sm text-stone-700">{person.interests.slice(0,3).join(' · ')}</p></div>
    <Link href={`/awardees/${encodeURIComponent(person.slug)}#talent-portfolio`} className="mt-auto flex min-h-12 items-center justify-between gap-3 pt-4 text-sm font-semibold text-orange-800">View talent profile <ArrowRight className="size-4" aria-hidden="true" /></Link>
  </article>
}
