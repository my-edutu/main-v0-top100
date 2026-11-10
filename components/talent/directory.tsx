'use client'

import { Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import Image from '@/components/safe-image'
import { ArrowRight, Users, X } from 'lucide-react'
import { TALENT_INTERESTS, TALENT_SECTORS, TALENT_WORK_MODES } from '@/lib/talent/contracts'
import { directorySearch, EMPTY_DIRECTORY_FILTERS, publicTalentSearch, readDirectoryState, type DirectoryFilters, type DirectoryView } from '@/lib/talent/directory-state'
import type { TalentCard, TalentPage } from '@/lib/talent/types'
import { DirectorySearch } from '@/components/directory-search'
import { TalentNotice } from './ui'

const actionClass = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f97316] px-4 text-sm font-semibold text-slate-950 hover:bg-[#fb923c] focus-visible:outline-2 focus-visible:outline-offset-2'
const filterFields = [
  { key: 'sector', label: 'Sector', placeholder: 'All sectors', options: TALENT_SECTORS },
  { key: 'interest', label: 'Open to', placeholder: 'Any opportunity', options: TALENT_INTERESTS },
  { key: 'country', label: 'Country', placeholder: 'Any country', maxLength: 100 },
  { key: 'skill', label: 'Skill', placeholder: 'Any skill', maxLength: 80 },
  { key: 'language', label: 'Language', placeholder: 'Any language', maxLength: 80 },
  { key: 'workMode', label: 'Work type', placeholder: 'Any work type', options: TALENT_WORK_MODES },
  { key: 'year', label: 'Award year', placeholder: 'All years', maxLength: 4 },
] as const

type DirectoryProps = { archive?: ReactNode; compact?: boolean }
export function TalentDirectory(props: DirectoryProps) {
  return <Suspense fallback={<p role="status" className="p-6 text-sm text-stone-600">Loading directory…</p>}><DirectoryContent {...props} /></Suspense>
}
function DirectoryContent({ archive, compact = false }: DirectoryProps) {
  const hasArchive = Boolean(archive)
  const publicDirectory = !compact
  const Heading = compact ? 'h2' : 'h1'
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlSearch = searchParams.toString()
  const routeState = useMemo(() => {
    const state = readDirectoryState(new URLSearchParams(urlSearch), publicDirectory || hasArchive)
    return publicDirectory && state.view === 'archive'
      ? { view: 'talent' as const, filters: EMPTY_DIRECTORY_FILTERS }
      : state
  }, [urlSearch, hasArchive, publicDirectory])
  const [view, setView] = useState<DirectoryView>(routeState.view)
  const [filters, setFilters] = useState<DirectoryFilters>(routeState.filters)
  const [applied, setApplied] = useState<DirectoryFilters>(routeState.filters)
  const filtersRef = useRef<HTMLDetailsElement>(null)
  const [page, setPage] = useState<TalentPage>({ people: [], nextCursor: null, total: 0 })
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [disabled, setDisabled] = useState(false)
  const [reload, setReload] = useState(0)
  const generation = useRef(0)
  const moreRequest = useRef<AbortController | null>(null)
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Browser navigation can replace the local search form and applied filters.
  useEffect(() => { setView(routeState.view); setFilters(routeState.filters); setApplied(routeState.filters) }, [routeState])
  const query = useMemo(() => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(applied)) if (value.trim()) params.set(key, value.trim())
    return params.toString()
  }, [applied])
  function navigate(nextView: DirectoryView, nextFilters = filters) {
    ++generation.current; moreRequest.current?.abort(); moreRequest.current = null
    setView(nextView); setFilters(nextFilters); setApplied(nextFilters); setLoadingMore(false)
    if (nextView === 'talent') setReload(value => value + 1)
    const current = new URLSearchParams(urlSearch)
    const next = publicDirectory ? publicTalentSearch(current, nextFilters) : directorySearch(current, nextView, nextFilters)
    router.push(`${pathname}?${next}`, { scroll: false })
  }
  useEffect(() => {
    const current = ++generation.current
    moreRequest.current?.abort(); moreRequest.current = null
    if (view !== 'talent') return
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the previous query's results before its replacement arrives.
    setLoading(true); setLoadingMore(false); setError(''); setPage({ people: [], nextCursor: null, total: 0 })
    fetch(`/api/talent?${query}`, { cache: 'no-store', signal: controller.signal }).then(async response => {
      if (response.status === 404 && hasArchive) {
        if (!controller.signal.aborted && generation.current === current) { setDisabled(true); setView('archive') }
        return null
      }
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'We could not load the talent directory.')
      return data as TalentPage
    }).then(data => { if (data && !controller.signal.aborted && generation.current === current) setPage(data) }).catch(reason => {
      if (!controller.signal.aborted && generation.current === current) setError(reason instanceof Error ? reason.message : 'Could not load talent.')
    }).finally(() => { if (!controller.signal.aborted && generation.current === current) setLoading(false) })
    return () => { controller.abort(); moreRequest.current?.abort() }
  }, [query, view, reload, hasArchive])
  async function loadMore() {
    if (!page.nextCursor || moreRequest.current || loadingMore) return
    const controller = new AbortController(); moreRequest.current = controller
    const current = generation.current
    setLoadingMore(true); setError('')
    try {
      const response = await fetch(`/api/talent?${query}&cursor=${encodeURIComponent(page.nextCursor)}`, { cache: 'no-store', signal: controller.signal })
      const data = await response.json() as TalentPage & { message?: string }
      if (!response.ok) throw new Error(data.message || 'Could not load more profiles.')
      if (!controller.signal.aborted && generation.current === current) setPage(previous => ({ ...data, people: [...previous.people, ...data.people.filter(person => !previous.people.some(old => old.id === person.id))] }))
    } catch (reason) { if (!controller.signal.aborted && generation.current === current) setError(reason instanceof Error ? reason.message : 'Could not load more profiles.') }
    finally {
      if (moreRequest.current === controller) moreRequest.current = null
      if (!controller.signal.aborted && generation.current === current) setLoadingMore(false)
    }
  }
  const change = (key: keyof DirectoryFilters, value: string) => setFilters(previous => ({ ...previous, [key]: value }))
  const activeFilters = filterFields.filter(field => applied[field.key])
  const clearFilters = () => navigate('talent', EMPTY_DIRECTORY_FILTERS)
  if (disabled && archive) return <>{archive}</>
  return <section className={compact ? 'space-y-6' : 'pb-6 sm:pb-10'} aria-label="Top100 talent network">
    {archive && <div className="mb-6 flex w-fit max-w-full gap-1 rounded-2xl border border-orange-200 bg-orange-50 p-1" aria-label="Directory view">
      {(['talent', 'archive'] as const).map(mode => <button key={mode} type="button" onClick={() => navigate(mode, mode === 'talent' ? filters : EMPTY_DIRECTORY_FILTERS)} aria-pressed={view === mode} className={`min-h-11 rounded-xl px-4 text-sm font-semibold focus-visible:outline-orange-700 ${view === mode ? 'bg-[#f97316] text-slate-950' : 'text-stone-700'}`}>{mode === 'talent' ? 'Discover talent' : 'Awardee archive'}</button>)}
    </div>}
    {view === 'archive' ? archive : <>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div>
          <Heading className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Discover African talent</Heading>
          <p className="mt-2 max-w-xl text-base leading-relaxed text-slate-600">Find people by name, skill or field. See what they’ve built and what they’d like to do next.</p>
        </div>
        <nav aria-label="Directory links" className="flex flex-wrap items-center gap-x-5 gap-y-1">
          {publicDirectory && <Link href="#leader-directory" className="inline-flex min-h-11 items-center text-sm font-semibold text-slate-700 underline underline-offset-4">Browse awardees</Link>}
          <Link href="/for-organisations/request" className={actionClass}>Share a job <ArrowRight className="size-4" aria-hidden="true" /></Link>
        </nav>
      </header>
      <form
        className="directory-toolbar flex-col sm:flex-row"
        onSubmit={event => {
          event.preventDefault()
          navigate('talent')
          if (filtersRef.current?.open) {
            filtersRef.current.open = false
            filtersRef.current.querySelector('summary')?.focus()
          }
        }}
      >
        <DirectorySearch
          id="talent-search"
          label="Search talent by name, skill or field"
          placeholder="Find a name, skill or field…"
          value={filters.q}
          onChange={value => change('q', value.slice(0, 100))}
          filterLabel="Filter talent"
          hasFilters={activeFilters.length > 0}
          filtersRef={filtersRef}
        >
          <div className="grid grid-cols-2 gap-2">
            {filterFields.map(field => {
              const id = `talent-${field.key}`
              return (
                <div className="directory-select" key={field.key}>
                  <label htmlFor={id}>{field.label}</label>
                  {'options' in field ? (
                    <select id={id} value={filters[field.key]} onChange={event => change(field.key, event.target.value)}>
                      <option value="">{field.placeholder}</option>
                      {field.options.map(item => <option key={item}>{item}</option>)}
                    </select>
                  ) : (
                    <input id={id} value={filters[field.key]} maxLength={field.maxLength}
                      inputMode={field.key === 'year' ? 'numeric' : undefined}
                      pattern={field.key === 'year' ? '[0-9]{4}' : undefined}
                      placeholder={field.placeholder} onChange={event => change(field.key, event.target.value)} />
                  )}
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button type="submit" className={actionClass}>Apply filters</button>
            <button type="button" className="directory-clear-filters" onClick={clearFilters}>Clear filters</button>
          </div>
        </DirectorySearch>
        <button type="submit" className={`${actionClass} self-start sm:self-stretch`}>Search talent</button>
      </form>
      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-2" aria-label="Applied talent filters">
          {activeFilters.map(({ key, label }) => (
            <button key={key} type="button"
              className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-stone-300 bg-[#fff] px-3 text-sm text-slate-700 hover:border-orange-500"
              aria-label={`Remove ${label} filter`}
              onClick={() => navigate('talent', { ...applied, [key]: '' })}
            >
              <span className="truncate">{label}: {applied[key]}</span>
              <X className="size-4 shrink-0" aria-hidden="true" />
            </button>
          ))}
        </div>
      )}
      <p aria-live="polite" className="mb-4 text-sm text-slate-600">
        {loading ? 'Finding profiles…' : error && !page.people.length ? 'Talent search is unavailable.' : `${page.total} matching ${page.total === 1 ? 'profile' : 'profiles'}`}
      </p>
      {error && <div className="mb-5"><TalentNotice error>{error} <button type="button" className="min-h-11 underline" onClick={() => setReload(value => value + 1)}>Retry</button></TalentNotice></div>}
      {loading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Loading talent profiles" aria-busy="true">{[0, 1, 2].map(item => <div key={item} className="h-32 animate-pulse rounded-2xl border border-stone-100 bg-stone-50 motion-reduce:animate-none" />)}</div>
        : page.people.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{page.people.map(person => <TalentCardView key={person.id} person={person} returnTo={`${pathname}${urlSearch ? `?${urlSearch}` : ''}`} />)}</div>
          : !error && (
            <div className="directory-empty">
              <Users size={28} aria-hidden="true" />
              <h3>{activeFilters.length || applied.q ? 'No profiles match your search' : 'No talent profiles to show yet'}</h3>
              <p>{activeFilters.length || applied.q ? 'Try a different search or remove a filter.' : 'Profiles appear here when members choose to share them.'}</p>
              {(activeFilters.length > 0 || applied.q) && <button type="button" onClick={clearFilters}>Clear search</button>}
            </div>
          )}
      {page.nextCursor && !loading && (
        <div className="mt-6">
          <button type="button" disabled={loadingMore} className={actionClass} onClick={() => void loadMore()}>
            {loadingMore ? 'Loading…' : 'Show more profiles'}
          </button>
        </div>
      )}
    </>}
  </section>
}
function TalentCardView({ person, returnTo }: { person: TalentCard; returnTo: string }) {
  const href = `/awardees/${encodeURIComponent(person.slug)}?returnTo=${encodeURIComponent(returnTo)}#talent-portfolio`
  return <article className="flex flex-col leader-card p-5 transition-colors hover:border-orange-300">
    <div className="flex items-start gap-3"><div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-amber-100 text-lg font-semibold text-slate-900">{person.avatarUrl ? <Image src={person.avatarUrl} alt="" width={56} height={56} className="size-14 object-cover" /> : person.name.split(' ').filter(Boolean).slice(0, 2).map(word => word[0]).join('')}</div><div className="min-w-0"><h2 className="break-words font-semibold text-stone-950"><Link className="hover:underline focus-visible:outline-orange-700" href={href}>{person.name}</Link></h2><p className="mt-1 text-xs text-stone-500">{[person.country, person.year ? `Top100 ${person.year}` : ''].filter(Boolean).join(' · ')}</p></div></div>
    <p className="mt-4 break-words text-base font-medium leading-6 text-stone-800">{person.headline}</p><p className="mt-1 text-sm text-slate-700">{person.sector}</p>
    <div className="mt-4 flex flex-wrap gap-2">{person.skills.slice(0, 3).map(skill => <span key={skill} className="max-w-full break-words rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-700">{skill}</span>)}</div>
    <div className="mt-5 border-t border-stone-100 pt-4"><p className="text-xs text-stone-500">Interested in</p><p className="mt-1 text-sm text-stone-700">{person.interests.slice(0, 3).join(' · ')}</p></div>
    <Link href={href} className="mt-auto flex min-h-12 items-center justify-between gap-3 pt-4 text-sm font-semibold text-slate-700">View talent profile <ArrowRight className="size-4" aria-hidden="true" /></Link>
  </article>
}
