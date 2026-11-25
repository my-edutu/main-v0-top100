'use client'

import { use, useEffect, useState } from 'react'
import { ExternalLink, Mail } from 'lucide-react'

import { DashboardLoading } from '@/app/dashboard/_components/dashboard-loading'
import { OpportunityCover } from '@/app/dashboard/_components/opportunity-cover'
import { useOpportunityDeadlineDay } from '@/app/dashboard/_lib/use-opportunity-deadline-day'
import { Button } from '@/components/ui/button'
import { fetchWithTimeout } from '@/lib/http/fetch-with-timeout'
import { renderMemberPostBody } from '@/lib/member-posts/content'
import type { EdutuOpportunity } from '@/lib/opportunities/edutu'
import { formatDeadlineDate, hasOpportunityExpired, type Opportunity } from '@/lib/opportunities/types'

type Detail = Opportunity | EdutuOpportunity

export default function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return <OpportunityDetails key={id} id={id} />
}

function OpportunityDetails({ id }: { id: string }) {
  const [result, setResult] = useState<Detail | 'missing' | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)
  const deadlineDay = useOpportunityDeadlineDay()

  useEffect(() => {
    const controller = new AbortController()
    const edutuPrefix = 'edutu-'
    const endpoint = id.startsWith(edutuPrefix)
      ? `/api/opportunities/edutu/${encodeURIComponent(id.slice(edutuPrefix.length))}`
      : `/api/member/opportunities/${encodeURIComponent(id)}`

    async function load() {
      try {
        const response = await fetchWithTimeout(endpoint, { cache: 'no-store', signal: controller.signal })
        if (response.status === 404) {
          if (!controller.signal.aborted) setResult('missing')
          return
        }
        if (!response.ok) throw new Error('Listing unavailable')
        const { opportunity } = await response.json() as { opportunity: Detail }
        if (!controller.signal.aborted) setResult(opportunity)
      } catch {
        if (!controller.signal.aborted) setResult('error')
      }
    }

    void load()
    return () => controller.abort()
  }, [attempt, id])

  if (!result) return <DashboardLoading label="Loading opportunity" />

  const missing = result === 'missing' || (typeof result === 'object' && hasOpportunityExpired(result.deadline, deadlineDay))
  if (missing || result === 'error') {
    return (
      <section className="mx-auto max-w-2xl py-12 text-center">
        <h1 className="text-2xl font-bold">
          {missing ? 'Opportunity unavailable' : 'Could not load this opportunity'}
        </h1>
        {missing ? (
          <p className="mt-2 text-[#61554d]">This listing may have closed or been removed.</p>
        ) : (
          <Button className="mt-4 min-h-11" onClick={() => { setResult(null); setAttempt(value => value + 1) }}>
            Try again
          </Button>
        )}
      </section>
    )
  }

  const opportunity = result
  const fromEdutu = 'source' in opportunity
  const deadline = fromEdutu && opportunity.deadlineNeedsReview
    ? 'Check with provider'
    : opportunity.deadline
      ? formatDeadlineDate(opportunity.deadline)
      : fromEdutu ? 'Deadline not listed' : 'Rolling'
  const applyUrl = opportunity.applicationUrl?.match(/^https?:\/\/\S+$/i)?.[0]
  const applicationHref = applyUrl ?? (opportunity.contactEmail ? `mailto:${opportunity.contactEmail}` : null)
  const edutuHref = fromEdutu
    ? `https://www.edutu.org/opportunity/${encodeURIComponent(opportunity.id.slice('edutu:'.length))}`
    : 'https://www.edutu.org/opportunities'
  const showSummary = opportunity.summary && !opportunity.description?.includes(opportunity.summary)

  return (
    <article className={`mx-auto max-w-[704px] space-y-6 text-[#1c1714] sm:space-y-8 sm:pt-4 ${applicationHref ? 'pb-[calc(8.5rem+env(safe-area-inset-bottom))]' : 'pb-4'}`}>
      <header>
        <h1 className="text-[clamp(1.875rem,5vw,2.75rem)] font-bold leading-[1.12] tracking-tight [overflow-wrap:anywhere]">
          {opportunity.title}
        </h1>
        {(opportunity.organization || fromEdutu) && (
          <p className="mt-2 text-base text-[#61554d]">{opportunity.organization ?? 'Edutu'}</p>
        )}
      </header>

      <OpportunityCover imageUrl={opportunity.imageUrl} detail />

      <dl className="grid grid-cols-2 gap-x-5 gap-y-4 rounded-2xl bg-[#f7f4f0] p-4 text-sm [overflow-wrap:anywhere] sm:p-5">
        <div><dt className="text-[#61554d]">Type</dt><dd className="mt-0.5 font-semibold">{opportunity.type}</dd></div>
        <div><dt className="text-[#61554d]">Deadline</dt><dd className="mt-0.5 font-semibold">{deadline}</dd></div>
        {opportunity.location && (
          <div><dt className="text-[#61554d]">Location</dt><dd className="mt-0.5 font-semibold">{opportunity.location}</dd></div>
        )}
        {opportunity.amountNote && (
          <div><dt className="text-[#61554d]">Funding</dt><dd className="mt-0.5 font-semibold">{opportunity.amountNote}</dd></div>
        )}
      </dl>

      <div className="space-y-4 text-base leading-7 [overflow-wrap:anywhere]">
        {showSummary && <p className="font-semibold">{opportunity.summary}</p>}
        {opportunity.description && (fromEdutu ? (
          <p className="whitespace-pre-line">{opportunity.description}</p>
        ) : (
          <div
            className="[&_a]:underline [&_li]:ml-4 [&_ol]:list-decimal [&_p+p]:mt-3 [&_ul]:list-disc"
            dangerouslySetInnerHTML={{ __html: renderMemberPostBody(opportunity.description) }}
          />
        ))}
      </div>

      <footer className={applicationHref
        ? 'fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white px-4 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] sm:px-6 lg:left-[88px] xl:left-[240px] xl:px-8'
        : 'border-t border-stone-200 pt-5'}>
        <div className="mx-auto max-w-[704px] text-center">
          {applicationHref && (
            <a
              href={applicationHref}
              target={applyUrl ? '_blank' : undefined}
              rel={applyUrl ? 'noopener noreferrer' : undefined}
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-xl bg-[#9a3412] px-5 text-base font-bold text-[#fffaf4] transition-colors hover:bg-[#7c2d12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-700"
            >
              {applyUrl ? 'Apply now' : 'Apply by email'}
              {applyUrl ? <ExternalLink size={18} aria-hidden="true" /> : <Mail size={18} aria-hidden="true" />}
            </a>
          )}
          <a
            href={edutuHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-[#9a3412] underline underline-offset-4 hover:text-[#7c2d12]"
          >
            View more on Edutu <ExternalLink size={14} aria-hidden="true" />
          </a>
        </div>
      </footer>
    </article>
  )
}
