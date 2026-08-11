'use client'

// app/dashboard/opportunities-section.tsx
// Replaces the inline OpportunitiesSection that used to live in
// app/dashboard/page.tsx. Same card language (the index % 3 colour rotation is
// kept deliberately) but backed by the member-only, visibility-tiered store at
// /api/member/opportunities instead of the public external-feed proxy.
//
// Nothing here ever asks for a visibility tier — the server decides what this
// member may see. The "Exclusive" badge simply reports what came back.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bookmark, BookmarkCheck, ExternalLink, Mail, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { MemberProfile } from '@/lib/member-hub'
import {
  OpportunitiesSetupRequiredError,
  fetchMemberOpportunities,
  saveOpportunity,
  unsaveOpportunity,
} from '@/lib/opportunities/client'
import {
  OPPORTUNITY_TYPES,
  formatDeadlineCountdown,
  isDeadlinePast,
  type Opportunity,
} from '@/lib/opportunities/types'

export default function OpportunitiesSection({
  member,
  initialSavedOnly = false,
}: {
  member: MemberProfile
  initialSavedOnly?: boolean
}) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [setupMessage, setSetupMessage] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [savedOnly, setSavedOnly] = useState(initialSavedOnly)
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  const [pendingSaveId, setPendingSaveId] = useState<string | null>(null)

  // Debounced so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft.trim()), 300)
    return () => clearTimeout(timer)
  }, [searchDraft])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    setSetupMessage('')
    try {
      const rows = await fetchMemberOpportunities({
        type: typeFilter || undefined,
        q: search || undefined,
        savedOnly,
      })
      setOpportunities(rows)
    } catch (loadError) {
      setOpportunities([])
      if (loadError instanceof OpportunitiesSetupRequiredError) {
        setSetupMessage(loadError.message)
      } else {
        setError(loadError instanceof Error ? loadError.message : 'Could not load opportunities.')
      }
    } finally {
      setLoading(false)
    }
  }, [typeFilter, search, savedOnly])

  useEffect(() => {
    load()
  }, [load])

  const exclusiveCount = useMemo(
    () => opportunities.filter((item) => item.visibility !== 'public').length,
    [opportunities],
  )

  async function handleToggleSave(opportunity: Opportunity) {
    const nextSaved = !opportunity.isSaved
    setPendingSaveId(opportunity.id)
    // Optimistic — the API is idempotent either way, so the worst case is a
    // rollback rather than a wrong write.
    setOpportunities((previous) =>
      previous.map((item) => (item.id === opportunity.id ? { ...item, isSaved: nextSaved } : item)),
    )

    try {
      if (nextSaved) {
        await saveOpportunity(opportunity.id)
        toast.success('Saved to your bookmarks.')
      } else {
        await unsaveOpportunity(opportunity.id)
      }
      // In the saved-only view an unsave should remove the card entirely.
      if (!nextSaved && savedOnly) {
        setOpportunities((previous) => previous.filter((item) => item.id !== opportunity.id))
      }
    } catch (saveError) {
      setOpportunities((previous) =>
        previous.map((item) => (item.id === opportunity.id ? { ...item, isSaved: !nextSaved } : item)),
      )
      toast.error(saveError instanceof Error ? saveError.message : 'Could not update your bookmark.')
    } finally {
      setPendingSaveId(null)
    }
  }

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-4xl font-bold tracking-tight text-black sm:text-5xl">Opportunities</h2>
        </div>
      </div>

      <div className="rounded-[30px] border border-orange-100 bg-white p-5 sm:p-7">
        <div className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">Member hub</p>
              <h3 className="mt-2 text-3xl font-bold tracking-tight text-black">
                Opportunities curated for awardees.
              </h3>
              <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-black/60">
                {exclusiveCount > 0
                  ? `${exclusiveCount} of these listings are exclusive to the network — you will not find them on the public site.`
                  : 'Scholarships, fellowships, grants and roles shared with the Top 100 network.'}
              </p>
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
              onClick={load}
              disabled={loading}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              {loading ? 'Refreshing' : 'Refresh'}
            </Button>
          </div>

          {/* Filters */}
          <div className="space-y-3">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/40" />
              <Input
                value={searchDraft}
                onChange={(event) => setSearchDraft(event.target.value)}
                placeholder="Search by title, organisation or summary"
                aria-label="Search opportunities"
                className="h-12 rounded-2xl border-orange-100 pl-11 text-black placeholder:text-black/40"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <FilterChip active={typeFilter === ''} onClick={() => setTypeFilter('')}>
                All types
              </FilterChip>
              {OPPORTUNITY_TYPES.map((type) => (
                <FilterChip key={type} active={typeFilter === type} onClick={() => setTypeFilter(type)}>
                  {type}
                </FilterChip>
              ))}
              <FilterChip active={savedOnly} onClick={() => setSavedOnly((previous) => !previous)}>
                <Bookmark className={cn('mr-1.5 inline h-3.5 w-3.5', savedOnly && 'fill-current')} />
                Saved
              </FilterChip>
            </div>
          </div>

          {/* States */}
          {setupMessage ? (
            <div className="rounded-[24px] border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-bold text-amber-900">Opportunities are not set up yet</p>
              <p className="mt-1 text-sm font-medium leading-6 text-amber-900/80">{setupMessage}</p>
            </div>
          ) : error ? (
            <div className="rounded-[24px] border border-orange-100 bg-white px-5 py-4">
              <p className="text-sm font-semibold text-orange-700">{error}</p>
              <Button
                variant="outline"
                onClick={load}
                className="mt-3 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : loading ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  className="h-52 animate-pulse rounded-[28px] border border-orange-100 bg-[#f5f4f0]"
                />
              ))}
            </div>
          ) : opportunities.length === 0 ? (
            <div className="rounded-[28px] border-2 border-dashed border-orange-200 bg-[#fffaf4] px-6 py-12 text-center">
              <p className="text-base font-bold text-black">
                {savedOnly ? 'No saved opportunities yet' : 'No opportunities to show yet'}
              </p>
              <p className="mx-auto mt-2 max-w-md text-sm font-medium leading-6 text-black/60">
                {savedOnly
                  ? 'Bookmark a listing with the save icon and it will wait for you here.'
                  : typeFilter || search
                    ? 'Nothing matches these filters. Try clearing the search or picking another type.'
                    : `New listings are posted here as they open, ${member.name.split(' ')[0] || 'awardee'}. Check back soon.`}
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {opportunities.map((opportunity, index) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  index={index}
                  saving={pendingSaveId === opportunity.id}
                  onToggleSave={() => handleToggleSave(opportunity)}
                />
              ))}
            </div>
          )}
        </div>
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
        'rounded-full border px-4 py-2 text-xs font-semibold transition-colors',
        active
          ? 'border-orange-500 bg-orange-500 text-[#fffaf0] hover:bg-orange-600'
          : 'border-orange-200 bg-white text-black/70 hover:bg-orange-50',
      )}
    >
      {children}
    </button>
  )
}

function OpportunityCard({
  opportunity,
  index,
  saving,
  onToggleSave,
}: {
  opportunity: Opportunity
  index: number
  saving: boolean
  onToggleSave: () => void
}) {
  // Kept from the original inline section so the feed still looks itself.
  // Text on every card is text-black — never text-white, which globals.css
  // rewrites under html.light.
  const onOrange = index % 3 === 0
  const surface = onOrange
    ? 'bg-orange-500'
    : index % 3 === 1
      ? 'bg-[#f5f4f0]'
      : 'bg-[#fff2e2] border border-orange-100'

  // An orange button on the orange card would vanish, so the CTA inverts there.
  const applyClasses = onOrange
    ? 'bg-[#fffaf0] text-black hover:bg-white'
    : 'bg-orange-500 text-[#fffaf0] hover:bg-orange-600'
  const exclusiveClasses = onOrange
    ? 'bg-[#fffaf0] text-black'
    : 'bg-orange-600 text-[#fffaf0]'

  const closed = isDeadlinePast(opportunity.deadline)
  const countdown = formatDeadlineCountdown(opportunity.deadline)
  const exclusive = opportunity.visibility !== 'public'

  return (
    <div className={cn('flex flex-col rounded-[28px] p-6 text-black', surface)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold tracking-[0.18em] text-black/55">
          {opportunity.type.toUpperCase()}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {exclusive ? (
            <span className={cn('rounded-full px-3 py-1 text-xs font-bold', exclusiveClasses)}>
              Exclusive
            </span>
          ) : null}
          <button
            type="button"
            onClick={onToggleSave}
            disabled={saving}
            aria-pressed={opportunity.isSaved}
            aria-label={opportunity.isSaved ? 'Remove bookmark' : 'Save this opportunity'}
            title={opportunity.isSaved ? 'Remove bookmark' : 'Save this opportunity'}
            className="grid h-8 w-8 place-items-center rounded-full bg-[#fffaf0] text-black transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {opportunity.isSaved ? (
              <BookmarkCheck className="h-4 w-4" strokeWidth={2.2} />
            ) : (
              <Bookmark className="h-4 w-4" strokeWidth={2.2} />
            )}
          </button>
        </div>
      </div>

      <h3 className="mt-4 text-2xl font-bold">{opportunity.title}</h3>

      {opportunity.organization ? (
        <p className="mt-1 text-sm font-semibold text-black/70">{opportunity.organization}</p>
      ) : null}

      {opportunity.summary ? (
        <p className="mt-3 line-clamp-3 text-sm font-medium leading-6 text-black/65">{opportunity.summary}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {opportunity.location ? (
          <span className="rounded-full bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-black">
            {opportunity.location}
          </span>
        ) : null}
        <span
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold text-black',
            closed ? 'bg-[#fffaf0] opacity-70' : 'bg-[#fffaf0]',
          )}
        >
          {countdown}
        </span>
        {opportunity.amountNote ? (
          <span className="rounded-full bg-[#fffaf0] px-4 py-2 text-sm font-semibold text-black">
            {opportunity.amountNote}
          </span>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {opportunity.applicationUrl ? (
          <a
            href={opportunity.applicationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition-colors',
              applyClasses,
            )}
          >
            Apply
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        ) : opportunity.contactEmail ? (
          <a
            href={`mailto:${opportunity.contactEmail}`}
            className={cn(
              'inline-flex items-center rounded-full px-6 py-3 text-sm font-semibold transition-colors',
              applyClasses,
            )}
          >
            Apply by email
            <Mail className="ml-2 h-4 w-4" />
          </a>
        ) : null}
      </div>
    </div>
  )
}
