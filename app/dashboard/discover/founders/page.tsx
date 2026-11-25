'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Linkedin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FOUNDERS_NETWORK_PATH } from '@/lib/founders-network'
import type { FounderDirectoryEntry } from '@/lib/founder-listing'
import { RouteSection } from '../../_components/route-section'
import { useDashboardMember } from '../../_providers/dashboard-member'

type Directory = { entries: FounderDirectoryEntry[]; hasNextPage: boolean }

export default function FoundersNetworkPage() {
  const { member } = useDashboardMember()
  const [page, setPage] = useState(1)
  const [directory, setDirectory] = useState<Directory | null>(null)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(`/api/member/founders?page=${page}`, { signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.message)
        setDirectory(data)
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Could not load founders.')
      }
    }
    void load()
    return () => controller.abort()
  }, [page, attempt])

  function changePage(nextPage: number) {
    setDirectory(null)
    setError('')
    setPage(nextPage)
  }

  return (
    <RouteSection title="Founders Network" description="Meet Top100 awardees building startups and connect with them directly."
      action={member.status === 'approved' ? (
        <Button asChild className="min-h-11"><Link href={`${FOUNDERS_NETWORK_PATH}/submit`}>Submit a startup</Link></Button>
      ) : null}>
      {error ? (
        <div className="space-y-3 rounded-xl border border-neutral-200 bg-white p-5">
          <p role="alert" className="text-sm text-neutral-700">{error}</p>
          {member.status === 'approved' && (
            <Button variant="outline" onClick={() => { setError(''); setAttempt(attempt + 1) }}>Try again</Button>
          )}
        </div>
      ) : !directory ? <p role="status" className="text-sm text-neutral-600">Loading founders…</p> : <>
        {directory.entries.length === 0 ? (
          <div className="rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="font-semibold">{page === 1 ? 'No startups listed yet' : 'No startups on this page'}</h2>
            {page === 1 && <p className="mt-1 text-sm text-neutral-600">Building something? Share your startup to help other founders find you.</p>}
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {directory.entries.map(entry => (
              <li key={entry.profileId} className="flex min-w-0 flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5">
                <div className="min-w-0">
                  <h2 className="break-words text-lg font-semibold">{entry.startup}</h2>
                  <p className="mt-1 break-words text-sm text-neutral-600">{entry.founderName}</p>
                </div>
                <p className="flex-1 break-words text-sm leading-6 text-neutral-700">{entry.summary}</p>
                {entry.profileId !== member.id && (
                  <Button asChild variant="outline" className="min-h-11 self-start">
                    <a href={entry.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label={`Connect with ${entry.founderName} on LinkedIn`}>
                      <Linkedin className="mr-2 size-4" aria-hidden="true" /> Connect on LinkedIn
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
        {(page > 1 || directory.hasNextPage) && (
          <nav className="flex gap-2" aria-label="Founder directory pages">
            <Button variant="outline" disabled={page === 1} onClick={() => changePage(page - 1)}>Previous</Button>
            <Button variant="outline" disabled={!directory.hasNextPage} onClick={() => changePage(page + 1)}>Next</Button>
          </nav>
        )}
      </>}
    </RouteSection>
  )
}
