'use client'

// app/dashboard/opportunities-section.tsx
// Nothing here ever asks for a visibility tier — the server decides what this
// member may see. The "Exclusive" badge simply reports what came back.
import { useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { ChevronRight, RefreshCw, Search, X } from 'lucide-react'

import { DashboardLoading } from './_components/dashboard-loading'
import { OpportunityCover } from './_components/opportunity-cover'
import { useOpportunityDeadlineDay } from './_lib/use-opportunity-deadline-day'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { fetchWithTimeout } from '@/lib/http/fetch-with-timeout'
import type { EdutuOpportunity, EdutuOpportunityPage } from '@/lib/opportunities/edutu'
import type { MemberProfile } from '@/lib/member-hub'
import {
  OpportunitiesSetupRequiredError,
  fetchMemberOpportunities,
} from '@/lib/opportunities/client'
import {
  OPPORTUNITY_TYPES,
  formatDeadlineCountdown,
  hasOpportunityExpired,
  type Opportunity,
} from '@/lib/opportunities/types'

const REFRESH_DISTANCE = 64

async function fetchEdutuPage(type: string, query: string, cursor?: string) {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (query) params.set('q', query.slice(0, 200))
  if (cursor) params.set('cursor', cursor)
  const response = await fetchWithTimeout(`/api/opportunities/edutu?${params}`, { cache: 'no-store' })
  if (!response.ok) throw new Error('Edutu listings are temporarily unavailable.')
  return await response.json() as EdutuOpportunityPage
}

export default function OpportunitiesSection({
  member,
}: {
  member: MemberProfile
}) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [edutu, setEdutu] = useState<EdutuOpportunity[]>([])
  const [edutuCursor, setEdutuCursor] = useState<string | null>(null)
  const [edutuError, setEdutuError] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupMessage, setSetupMessage] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const deadlineDay = useOpportunityDeadlineDay()
  const sectionRef = useRef<HTMLElement>(null)
  const searchInput = useRef<HTMLInputElement>(null)
  const requestId = useRef(0)
  const activeOpportunities = [...opportunities, ...edutu].filter(item =>
    item.status === 'published' && !hasOpportunityExpired(item.deadline, deadlineDay),
  )

  const closeSearch = useCallback(() => {
    setSearchOpen(false)
    setSearchDraft('')
    setSearch('')
    document.getElementById('opportunity-search-button')?.focus({ preventScroll: true })
  }, [])

  useEffect(() => {
    function toggleSearch() {
      if (searchOpen) {
        closeSearch()
        return
      }
      flushSync(() => setSearchOpen(true))
      searchInput.current?.focus({ preventScroll: true })
    }
    window.addEventListener('dashboard:toggle-opportunity-search', toggleSearch)
    return () => window.removeEventListener('dashboard:toggle-opportunity-search', toggleSearch)
  }, [closeSearch, searchOpen])

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchDraft])

  const load = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    setSetupMessage('')
    setEdutuError(false)
    setLoadingMore(false)

    const [memberResult, edutuResult] = await Promise.allSettled([
      fetchMemberOpportunities({ type: typeFilter || undefined, q: search || undefined }),
      fetchEdutuPage(typeFilter, search),
    ])
    if (id !== requestId.current) return

    if (memberResult.status === 'fulfilled') {
      setOpportunities(memberResult.value)
    } else {
      setOpportunities([])
      const reason = memberResult.reason
      if (reason instanceof OpportunitiesSetupRequiredError) setSetupMessage(reason.message)
      else setError('Top100 listings are temporarily unavailable.')
    }

    if (edutuResult.status === 'fulfilled') {
      setEdutu(edutuResult.value.opportunities)
      setEdutuCursor(edutuResult.value.nextCursor)
    } else {
      setEdutu([])
      setEdutuCursor(null)
      setEdutuError(true)
    }
    setLoading(false)
    setRefreshing(false)
  }, [typeFilter, search])

  async function loadMoreEdutu() {
    if (!edutuCursor || loading || loadingMore) return
    const id = requestId.current
    setLoadingMore(true)
    setEdutuError(false)
    try {
      const page = await fetchEdutuPage(typeFilter, search, edutuCursor)
      if (id !== requestId.current) return
      setEdutu(previous => {
        const known = new Set(previous.map(item => item.id))
        return [...previous, ...page.opportunities.filter(item => !known.has(item.id))]
      })
      setEdutuCursor(page.nextCursor)
    } catch {
      if (id === requestId.current) setEdutuError(true)
    } finally {
      if (id === requestId.current) setLoadingMore(false)
    }
  }

  useEffect(() => {
    load()
  }, [load])

  const refresh = useCallback(() => {
    if (loading) return
    setRefreshing(true)
    void load()
  }, [load, loading])

  useEffect(() => {
    const section = sectionRef.current
    if (!section || loading) return
    let start: { x: number; y: number } | undefined
    let distance = 0

    function reset() {
      start = undefined
      distance = 0
      setPullDistance(0)
    }

    function onTouchStart(event: TouchEvent) {
      reset()
      if (event.touches.length !== 1 || (document.scrollingElement?.scrollTop ?? 0) > 0) return
      if (event.target instanceof Element && event.target.closest('input, button, [contenteditable], [data-opportunity-filters]')) return
      const touch = event.touches[0]
      start = { x: touch.clientX, y: touch.clientY }
    }

    function onTouchMove(event: TouchEvent) {
      if (!start) return
      if (event.touches.length !== 1 || !event.cancelable) {
        reset()
        return
      }
      const touch = event.touches[0]
      const deltaY = touch.clientY - start.y
      const deltaX = Math.abs(touch.clientX - start.x)
      if (!distance && (deltaY < -6 || deltaX > Math.max(8, deltaY))) {
        reset()
        return
      }
      if (deltaY <= 0 && !distance) return
      event.preventDefault()
      distance = Math.min(REFRESH_DISTANCE, Math.max(0, deltaY * 0.65))
      setPullDistance(distance)
    }

    function onTouchEnd() {
      const shouldRefresh = distance >= REFRESH_DISTANCE
      reset()
      if (shouldRefresh) refresh()
    }

    section.addEventListener('touchstart', onTouchStart, { passive: true })
    section.addEventListener('touchmove', onTouchMove, { passive: false })
    section.addEventListener('touchend', onTouchEnd)
    section.addEventListener('touchcancel', reset)
    return () => {
      section.removeEventListener('touchstart', onTouchStart)
      section.removeEventListener('touchmove', onTouchMove)
      section.removeEventListener('touchend', onTouchEnd)
      section.removeEventListener('touchcancel', reset)
    }
  }, [loading, refresh])

  return (
    <section ref={sectionRef} aria-label="Explore opportunities" className="min-w-0 space-y-4">
      <div className="sticky top-[60px] z-30 min-w-0 bg-white">
        <div id="opportunity-search" hidden={!searchOpen}>
          {searchOpen && (
            <div className="flex min-w-0 items-center gap-1 pt-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-stone-500" aria-hidden="true" />
                <Input
                  ref={searchInput}
                  type="search"
                  value={searchDraft}
                  onChange={(event) => setSearchDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                      event.preventDefault()
                      closeSearch()
                    }
                  }}
                  placeholder="Search opportunities"
                  aria-label="Search opportunities"
                  className="h-11 rounded-xl border-stone-200 bg-white pl-11 text-[#171412] placeholder:text-stone-500"
                />
              </div>
              <button
                type="button"
                aria-label="Close and clear search"
                onClick={closeSearch}
                className="grid size-11 shrink-0 place-items-center rounded-xl text-stone-600 hover:bg-orange-50 focus-visible:outline-2 focus-visible:outline-orange-700"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
        <div
          role="group"
          aria-label="Filter opportunities by type"
          data-opportunity-filters
          className="flex min-w-0 items-center gap-1.5 overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {['', ...OPPORTUNITY_TYPES].map(type => (
            <FilterChip key={type} active={typeFilter === type} onClick={() => {
              setTypeFilter(type)
              if (!searchDraft.trim()) setSearchOpen(false)
            }}>
              {type || 'All'}
            </FilterChip>
          ))}
          <button
            type="button"
            aria-label="Refresh listings"
            title="Refresh listings"
            disabled={loading}
            onClick={refresh}
            className="grid size-11 shrink-0 place-items-center rounded-full text-stone-600 hover:text-orange-800 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-orange-700 disabled:opacity-40"
          >
            <RefreshCw size={14} aria-hidden="true" />
          </button>
        </div>
      </div>
      {(pullDistance > 0 || refreshing) && (
        <p role="status" className="flex min-h-6 items-center justify-center gap-2 text-xs text-stone-600">
          <RefreshCw size={14} className={refreshing ? 'motion-safe:animate-spin' : undefined} aria-hidden="true" />
          {refreshing ? 'Refreshing opportunities…' : pullDistance >= REFRESH_DISTANCE ? 'Release to refresh' : 'Pull to refresh'}
        </p>
      )}
      <div aria-busy={loading} className="space-y-4">
        {(setupMessage || error || edutuError) && (
          <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            {setupMessage || error ? <p>Top100 listings are temporarily unavailable.</p> : null}
            {edutuError && <p>Edutu listings are temporarily unavailable.</p>}
            <Button type="button" variant="ghost" className="mt-1 h-11" onClick={refresh}>Try again</Button>
          </div>
        )}
        {loading && (!refreshing || activeOpportunities.length === 0) ? (
          <DashboardLoading label="Loading opportunities" />
        ) : (
          <>
            {activeOpportunities.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {activeOpportunities.map((opportunity) => (
                  <OpportunityCard key={opportunity.id} opportunity={opportunity} deadlineDay={deadlineDay} />
                ))}
              </div>
            ) : !setupMessage && !error && !edutuError && (
              <div className="rounded-2xl border border-orange-100 bg-[#fffaf4] px-6 py-10 text-center">
                <p className="font-semibold text-black">No opportunities to show yet</p>
                <p className="mt-2 text-sm text-black/65">
                  {typeFilter || search
                    ? 'Try another search or opportunity type.'
                    : `New listings appear here as they open, ${member.name.split(' ')[0] || 'awardee'}.`}
                </p>
              </div>
            )}
            {edutuCursor && (
              <Button type="button" variant="outline" className="min-h-11" onClick={loadMoreEdutu} disabled={loading || loadingMore}>
                {loadingMore ? 'Loading…' : 'More from Edutu'}
              </Button>
            )}
          </>
        )}
      </div>
    </section>
  )
}

function FilterChip({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className="group flex min-h-11 shrink-0 items-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-orange-700"
    >
      <span
        className={cn(
          'inline-flex h-7 items-center whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold transition-colors',
          active
            ? 'border-[#fedb56] bg-[#ffe477] text-[#302400]'
            : 'border-stone-200 bg-[#f7f5f2] text-[#51463e] group-hover:bg-orange-50',
        )}
      >
        {children}
      </span>
    </button>
  )
}

function OpportunityCard({ opportunity, deadlineDay }: {
  opportunity: Opportunity | EdutuOpportunity
  deadlineDay: string
}) {
  const fromEdutu = 'source' in opportunity
  const countdown = fromEdutu && opportunity.deadlineNeedsReview ? 'Check with provider'
    : fromEdutu && !opportunity.deadline ? 'Deadline not listed'
    : formatDeadlineCountdown(opportunity.deadline, new Date(`${deadlineDay}T12:00:00`))
  const sourceLabel = fromEdutu ? 'Edutu' : opportunity.visibility !== 'public' ? 'Exclusive' : null

  return (
    <Link
      href={`/dashboard/discover/opportunities/${encodeURIComponent(opportunity.id.replace(/^edutu:/, 'edutu-'))}`}
      aria-label={`View details for ${opportunity.title}`}
      className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left text-[#1c1714] transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
    >
      <OpportunityCover imageUrl={opportunity.imageUrl} />
      <span className="flex w-full flex-1 flex-col px-4 pb-3 pt-4 sm:px-5">
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold">
          <span className="text-[#9a3412]">{opportunity.type}</span>
          {sourceLabel && <span className="rounded-full bg-[#f5f0eb] px-2 py-0.5 text-[#60544b]">{sourceLabel}</span>}
        </span>
        <span className="mt-2 text-xl font-bold leading-tight tracking-tight [overflow-wrap:anywhere]">
          {opportunity.title}
        </span>
        {opportunity.organization && (
          <span className="mt-1 text-sm text-[#61554d] [overflow-wrap:anywhere]">{opportunity.organization}</span>
        )}
        {opportunity.summary && (
          <span className="mb-3 mt-2 line-clamp-2 text-sm leading-5 text-[#61554d]">{opportunity.summary}</span>
        )}
        <span className="mt-auto pt-3">
          <span className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-stone-200 pt-3 text-sm">
            <span className="font-medium text-[#61554d]">{countdown}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-[#9a3412] group-hover:underline">
              View details <ChevronRight size={16} aria-hidden="true" />
            </span>
          </span>
        </span>
      </span>
    </Link>
  )
}
