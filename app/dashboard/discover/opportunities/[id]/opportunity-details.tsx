'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ArrowLeft, ExternalLink, Mail } from 'lucide-react'

import { DashboardLoading } from '@/app/dashboard/_components/dashboard-loading'
import { OpportunityCover } from '@/app/dashboard/_components/opportunity-cover'
import { Button } from '@/components/ui/button'
import { fetchWithTimeout } from '@/lib/http/fetch-with-timeout'
import { renderMemberPostBody } from '@/lib/member-posts/content'
import type { EdutuOpportunity } from '@/lib/opportunities/edutu'
import { formatEdutuDescription } from '@/lib/opportunities/edutu-description'
import { formatDeadlineDate, type Opportunity } from '@/lib/opportunities/types'

const feed = '/dashboard/discover/opportunities'
const edutuPrefix = 'edutu-'
type Detail = Opportunity | EdutuOpportunity

export function OpportunityDetails({ id }: { id: string }) {
  const [result, setResult] = useState<Detail | 'missing' | 'error' | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
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

  return <div className="mx-auto max-w-5xl pb-6 text-[#1c1714]">
    <Link href={feed} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-orange-900 hover:underline">
      <ArrowLeft size={16} aria-hidden="true" /> All opportunities
    </Link>
    {!result ? <DashboardLoading label="Loading opportunity" />
      : typeof result === 'string' ? <section className="max-w-lg space-y-3 py-7">
        <h1 className="text-2xl font-semibold">{result === 'missing' ? 'Opportunity unavailable' : 'Could not load this opportunity'}</h1>
        {result === 'missing' ? <p className="text-[#61554d]">This listing may have closed or been removed.</p>
          : <Button onClick={() => { setResult(null); setAttempt(value => value + 1) }}>Try again</Button>}
      </section>
      : <OpportunityArticle opportunity={result} />}
  </div>
}

function OpportunityArticle({ opportunity }: { opportunity: Detail }) {
  const fromEdutu = 'source' in opportunity
  const deadline = fromEdutu && opportunity.deadlineNeedsReview ? 'Check with provider'
    : opportunity.deadline ? formatDeadlineDate(opportunity.deadline)
    : fromEdutu ? 'Deadline not listed' : 'Rolling'
  const applyUrl = opportunity.applicationUrl?.match(/^https?:\/\/\S+$/i)?.[0]
  const applyHref = applyUrl ?? (opportunity.contactEmail ? `mailto:${opportunity.contactEmail}` : null)
  const facts = [
    ['Type', opportunity.type], ['Deadline', deadline],
    ['Location', opportunity.location], ['Funding', opportunity.amountNote],
  ].filter(([, value]) => value)

  return <article className="space-y-6 [overflow-wrap:anywhere] sm:space-y-8">
    <header className="max-w-4xl space-y-2">
      <h1 className="text-[clamp(1.75rem,4.5vw,2.75rem)] font-bold leading-tight tracking-tight">{opportunity.title}</h1>
      {(opportunity.organization || fromEdutu) && (
        <p className="text-sm text-[#61554d] sm:text-base">{opportunity.organization ?? 'Edutu'}</p>
      )}
    </header>

    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_16rem] xl:gap-8">
      <div className="min-w-0 empty:hidden lg:col-start-1"><OpportunityCover imageUrl={opportunity.imageUrl} detail /></div>
      <aside aria-label="Opportunity details and application" className="min-w-0 space-y-4 rounded-2xl bg-[#f7f4f0] p-4 sm:p-5 lg:sticky lg:top-20 lg:col-start-2 lg:row-start-1 lg:row-span-2">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm lg:grid-cols-1">
          {facts.map(([label, value]) => (
            <div key={label}><dt className="text-[#61554d]">{label}</dt><dd className="mt-0.5 font-semibold">{value}</dd></div>
          ))}
        </dl>
        {applyHref && <a
          href={applyHref}
          target={applyUrl ? '_blank' : undefined}
          rel={applyUrl ? 'noopener noreferrer' : undefined}
          className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#9a3412] px-4 text-sm font-semibold text-white hover:bg-[#7c2d12]"
        >
          {applyUrl ? 'Apply on provider site' : 'Apply by email'}
          {applyUrl ? <ExternalLink size={16} aria-hidden="true" /> : <Mail size={16} aria-hidden="true" />}
        </a>}
      </aside>
      <div className="min-w-0 lg:col-start-1">
        {fromEdutu ? <EdutuDescription opportunity={opportunity} /> : <>
          {opportunity.summary && !opportunity.description?.includes(opportunity.summary) && (
            <p className="mb-4 text-base font-medium leading-7">{opportunity.summary}</p>
          )}
          {opportunity.description && (
            <div
              className="space-y-4 text-base leading-7 [&_a]:text-orange-900 [&_a]:underline [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:font-semibold [&_ol]:list-decimal [&_ul]:list-disc [&_ol]:pl-6 [&_ul]:pl-6"
              dangerouslySetInnerHTML={{ __html: renderMemberPostBody(opportunity.description) }}
            />
          )}
        </>}
      </div>
    </div>
  </article>
}

function EdutuDescription({ opportunity }: { opportunity: EdutuOpportunity }) {
  const sections = formatEdutuDescription(opportunity.title, opportunity.summary, opportunity.description)
  return <div className="space-y-7 text-base leading-7 text-stone-800">
    {sections.map(({ heading, blocks }, sectionIndex) => (
      <section key={sectionIndex} className="space-y-3">
        {heading && <h2 className="text-xl font-semibold leading-snug tracking-tight text-stone-950">{heading}</h2>}
        {blocks.map((block, blockIndex) => {
          if (block.type === 'list') return <ul key={blockIndex} className="list-disc space-y-1.5 pl-6">
            {block.items.map((item, index) => <li key={index}>{item}</li>)}
          </ul>
          if (block.type === 'facts') return <dl key={blockIndex} className="divide-y divide-stone-200 border-y border-stone-200 text-sm">
            {block.items.map(({ label, value }, index) => <div key={index} className="grid gap-0.5 py-2 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4">
              <dt className="font-semibold">{label}</dt><dd>{value}</dd>
            </div>)}
          </dl>
          return <p key={blockIndex} className="whitespace-pre-line">{block.text}</p>
        })}
      </section>
    ))}
  </div>
}
