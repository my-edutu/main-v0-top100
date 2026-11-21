'use client'

// app/dashboard/opportunities-section.tsx
// Nothing here ever asks for a visibility tier — the server decides what this
// member may see. The "Exclusive" badge simply reports what came back.
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChevronRight, ExternalLink, Mail, RefreshCw, Search, SlidersHorizontal } from 'lucide-react'

import { DashboardLoading } from './_components/dashboard-loading'
import SafeImage from '@/components/safe-image'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { fetchWithTimeout } from '@/lib/http/fetch-with-timeout'
import type { EdutuOpportunity, EdutuOpportunityPage } from '@/lib/opportunities/edutu'
import type { MemberProfile } from '@/lib/member-hub'
import { renderMemberPostBody } from '@/lib/member-posts/content'
import defaultOpportunityCover from '@/public/dashboard/cards/opportunities.jpg'
import {
  OpportunitiesSetupRequiredError,
  fetchMemberOpportunities,
} from '@/lib/opportunities/client'
import {
  OPPORTUNITY_TYPES,
  formatDeadlineCountdown,
  formatDeadlineDate,
  hasOpportunityExpired,
  nextOpportunityDeadlineCheck,
  opportunityDeadlineDay,
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
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [deadlineDay, setDeadlineDay] = useState(opportunityDeadlineDay)
  const sectionRef = useRef<HTMLElement>(null)
  const requestId = useRef(0)
  const activeOpportunities = [...opportunities, ...edutu].filter(item =>
    item.status === 'published' && !hasOpportunityExpired(item.deadline, deadlineDay),
  )

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    function checkDeadlines() {
      clearTimeout(timer)
      const now = new Date()
      setDeadlineDay(opportunityDeadlineDay(now))
      timer = setTimeout(checkDeadlines, Math.max(1, nextOpportunityDeadlineCheck(now) - now.getTime()))
    }
    checkDeadlines()
    window.addEventListener('focus', checkDeadlines)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', checkDeadlines)
    }
  }, [])

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
    if (!section || loading || filtersOpen) return
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
      if (event.target instanceof Element && event.target.closest('input, button, [contenteditable]')) return
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
  }, [filtersOpen, loading, refresh])

  return (
    <section ref={sectionRef} aria-label="Explore opportunities" className="min-w-0 space-y-4">
      <div className="flex min-w-0 items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-500" aria-hidden="true" />
          <Input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search opportunities"
            aria-label="Search opportunities"
            className="h-12 rounded-xl border-stone-200 bg-white pl-11 text-[#171412] placeholder:text-stone-500"
          />
        </div>
        <Popover open={filtersOpen} onOpenChange={setFiltersOpen}>
          <PopoverTrigger asChild>
            <Button
              aria-label={typeFilter ? `Filter opportunities, ${typeFilter} selected` : 'Filter opportunities'}
              variant="outline"
              className={cn('relative size-12 shrink-0 rounded-xl border-stone-200 bg-white text-[#171412]', typeFilter && 'border-orange-300 bg-orange-50 text-orange-800')}
            >
              <SlidersHorizontal size={19} aria-hidden="true" />
              {typeFilter && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-orange-600" aria-hidden="true" />}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" aria-label="Opportunity filters" className="w-[min(19rem,calc(100vw-2rem))] rounded-2xl border-stone-200 bg-white p-4 text-[#171412]">
            <p className="mb-3 text-sm font-semibold">Opportunity type</p>
            <div className="flex flex-wrap gap-2">
              {['', ...OPPORTUNITY_TYPES].map(type => (
                <FilterChip key={type} active={typeFilter === type} onClick={() => {
                  setTypeFilter(type)
                  setFiltersOpen(false)
                }}>
                  {type || 'All types'}
                </FilterChip>
              ))}
            </div>
            <Button variant="ghost" className="mt-3 h-11 w-full justify-start border-t border-stone-200" disabled={loading} onClick={() => {
              setFiltersOpen(false)
              refresh()
            }}>
              <RefreshCw aria-hidden="true" /> Refresh listings
            </Button>
          </PopoverContent>
        </Popover>
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
      className={cn(
        'min-h-11 rounded-full border px-4 py-2 text-xs font-semibold transition-colors',
        active
          ? 'border-orange-500 bg-orange-500 text-[#fffaf0] hover:bg-orange-600'
          : 'border-orange-200 bg-white text-black/70 hover:bg-orange-50',
      )}
    >
      {children}
    </button>
  )
}

function OpportunityCover({ imageUrl, detail = false }: { imageUrl?: string | null; detail?: boolean }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const image = imageUrl && imageUrl !== failedUrl ? imageUrl : null

  if (detail && !image) return null

  return (
    <span className={cn(
      'relative block overflow-hidden bg-[#eee8e0]',
      detail ? 'aspect-[16/9] rounded-xl' : 'aspect-[7/3] shrink-0',
    )}>
      <SafeImage
        src={image ?? defaultOpportunityCover}
        alt=""
        fill
        sizes={detail ? '(max-width: 640px) 90vw, 560px' : '(max-width: 767px) 100vw, 50vw'}
        unoptimized={Boolean(image)}
        referrerPolicy="no-referrer"
        className={detail ? 'object-contain' : 'object-cover'}
        onError={image ? () => setFailedUrl(image) : undefined}
      />
    </span>
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
  const applicationUrl = opportunity.applicationUrl?.match(/^https?:\/\/\S+$/i)?.[0]
  const hasApplication = applicationUrl || opportunity.contactEmail
  const showSummary = opportunity.summary && !opportunity.description?.includes(opportunity.summary)
  const deadline = opportunity.deadline && !(fromEdutu && opportunity.deadlineNeedsReview)
    ? formatDeadlineDate(opportunity.deadline)
    : countdown

  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
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
        </button>
      </DialogTrigger>
      <DialogContent
        className="z-[100] grid max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden rounded-2xl border-stone-200 bg-white p-0 text-[#1c1714]"
        overlayClassName="z-[99] bg-black/50"
      >
        <div className="border-b border-stone-200 px-5 py-4 pr-16 sm:px-6 sm:pr-16">
          <DialogTitle className="text-xl font-bold leading-tight [overflow-wrap:anywhere]">{opportunity.title}</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-[#61554d]">
            {opportunity.organization ?? (fromEdutu ? 'Edutu' : opportunity.type)}
          </DialogDescription>
        </div>
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
            <OpportunityCover imageUrl={opportunity.imageUrl} detail />
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-[#f7f4f0] p-4 text-sm [overflow-wrap:anywhere]">
              <div><dt className="text-[#61554d]">Type</dt><dd className="font-semibold">{opportunity.type}</dd></div>
              <div>
                <dt className="text-[#61554d]">Deadline</dt>
                <dd className="font-semibold">{deadline}</dd>
              </div>
              {opportunity.location && (
                <div><dt className="text-[#61554d]">Location</dt><dd className="font-semibold">{opportunity.location}</dd></div>
              )}
              {opportunity.amountNote && (
                <div><dt className="text-[#61554d]">Funding</dt><dd className="font-semibold">{opportunity.amountNote}</dd></div>
              )}
            </dl>
            {showSummary && (
              <p className="text-sm font-medium leading-6 [overflow-wrap:anywhere]">{opportunity.summary}</p>
            )}
            {opportunity.description && (fromEdutu ? (
              <p className="whitespace-pre-line text-sm leading-6 [overflow-wrap:anywhere]">{opportunity.description}</p>
            ) : (
              <div
                className="text-sm leading-6 [overflow-wrap:anywhere] [&_a]:underline [&_li]:ml-4 [&_ol]:list-decimal [&_p+p]:mt-3 [&_ul]:list-disc"
                dangerouslySetInnerHTML={{ __html: renderMemberPostBody(opportunity.description) }}
              />
            ))}
          </div>
          {hasApplication && (
            <div className="shrink-0 border-t border-stone-200 px-5 py-3 sm:px-6">
              {applicationUrl ? (
                <a
                  href={applicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9a3412] px-5 text-sm font-semibold text-[#fffaf4] hover:bg-[#7c2d12]"
                >
                  Apply on provider site
                  <ExternalLink size={16} aria-hidden="true" />
                </a>
              ) : (
                <a
                  href={`mailto:${opportunity.contactEmail}`}
                  className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#9a3412] px-5 text-sm font-semibold text-[#fffaf4] hover:bg-[#7c2d12]"
                >
                  Apply by email
                  <Mail size={16} aria-hidden="true" />
                </a>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
