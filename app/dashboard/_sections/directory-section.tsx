'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, MapPin, MessageCircle, RefreshCw, Search, ShieldAlert } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import type { Awardee } from '@/lib/awardees-shared'
import type { MemberProfile } from '@/lib/member-hub'
import { cn } from '@/lib/utils'

const directoryCohorts = [
  { year: 2024, title: '2024 Awardees', surface: 'bg-[#fffaf2]' },
  { year: 2025, title: '2025 Awardees', surface: 'bg-[#f7f7f5]' },
  { year: 2026, title: '2026 Awardees', surface: 'bg-[#fcfbf7]' },
]

export function DirectorySection({ member }: { member: MemberProfile }) {
  const [awardees, setAwardees] = useState<Awardee[]>([])
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [page, setPage] = useState(0)
  useEffect(() => { setPage(0) }, [searchTerm, selectedYear])

  useEffect(() => {
    let cancelled = false

    async function loadAwardees() {
      setLoading(true)
      setLoadFailed(false)
      try {
        const response = await fetch('/api/awardees', { cache: 'no-store' })
        if (!response.ok) throw new Error('Directory request failed')
        const payload = await response.json()
        if (!cancelled) setAwardees(Array.isArray(payload) ? payload : [])
      } catch {
        if (!cancelled) {
          setAwardees([])
          setLoadFailed(true)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void loadAwardees()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const filteredAwardees = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return awardees.filter((awardee) => {
      const matchesYear = selectedYear === 'all' || Number(awardee.year) === selectedYear
      const haystack = [
        awardee.name,
        awardee.country || '',
        awardee.headline || '',
        awardee.tagline || '',
        awardee.bio || '',
        awardee.course || '',
        awardee.field_of_study || '',
      ]
        .join(' ')
        .toLowerCase()

      return matchesYear && (!term || haystack.includes(term))
    })
  }, [awardees, searchTerm, selectedYear])

  const pageCount = Math.max(1, Math.ceil(filteredAwardees.length / 12))
  const currentPage = Math.min(page, pageCount - 1)
  const visibleAwardees = filteredAwardees.slice(currentPage * 12, (currentPage + 1) * 12)
  const restrictedStatus = member.status === 'suspended' || member.status === 'rejected' ? member.status : null
  const messagingRestricted = restrictedStatus !== null

  return (
    <div className="hub-directory min-w-0">
      <div className="space-y-5">
        {restrictedStatus ? <DirectoryRecoveryCard status={restrictedStatus} /> : null}

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="rounded-full bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700">
            {loading ? 'Loading leaders' : `${filteredAwardees.length} leaders found`}
          </div>
        </div>

        <div className="hub-cohort-filters grid grid-cols-3 gap-2">
          {directoryCohorts.map((cohort) => (
            <button
              key={cohort.year}
              type="button"
              onClick={() => setSelectedYear(current => current === cohort.year ? 'all' : cohort.year)}
              aria-label={`${cohort.year} cohort${selectedYear === cohort.year ? ', selected; activate to show all years' : ''}`}
              aria-pressed={selectedYear === cohort.year}
              className={cn(
                'group flex min-h-16 flex-col justify-center rounded-xl border p-3 text-left text-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-600 focus-visible:ring-offset-2',
                cohort.surface,
                selectedYear === cohort.year ? 'border-black/15 ring-1 ring-black/10' : 'border-black/5',
              )}
            >
              <div className="hidden">
                <span className="w-fit rounded-full border border-black/10 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-black/45">
                  Cohort
                </span>
                <ArrowRight
                  className="mt-0.5 h-4 w-4 text-black/30 transition group-hover:translate-x-1"
                  strokeWidth={2.4}
                />
              </div>
              <div>
                <span className="text-base font-medium">{cohort.year}</span>
                <span className="mt-1 block text-xs text-neutral-500">Cohort</span>
              </div>
            </button>
          ))}
        </div>

        <div className="min-w-0">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" strokeWidth={2.8} />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search name, country, field..."
                aria-label="Search awardees by name, country, or field"
                className="h-12 rounded-full border-black/10 pl-11 text-base text-black placeholder:text-black/35"
              />
            </div>
          </div>

          <div id="top-awardee-list" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {visibleAwardees.map((awardee) => (
              <article
                key={awardee.awardee_id || awardee.slug}
                className="min-w-0 rounded-2xl border border-neutral-200 bg-white p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#050505] text-sm font-bold text-[#fffaf0]">
                    {getInitials(awardee.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="break-words text-base font-medium text-black">{awardee.name}</h3>
                    <p className="mt-1 line-clamp-2 text-[15px] font-medium leading-6 text-black/55">
                      {awardee.headline || awardee.tagline || awardee.bio || 'Africa Future Leader'}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {awardee.country ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-black/65">
                      <MapPin className="h-3.5 w-3.5" strokeWidth={2.8} />
                      {awardee.country}
                    </span>
                  ) : null}
                  {awardee.year ? (
                    <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700">
                      {awardee.year}
                    </span>
                  ) : null}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <Button
                    asChild
                    className="h-10 rounded-full border border-black/10 bg-[#f5f5f2] px-4 text-sm font-semibold text-black/80 shadow-none hover:bg-white"
                  >
                    <Link href={`/awardees/${awardee.slug}`} prefetch>
                      View BIO
                    </Link>
                  </Button>
                  {awardee.profile_id && !messagingRestricted ? (
                    <Button
                      asChild
                      variant="outline"
                      className="h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black/75 shadow-none hover:bg-[#fafafa]"
                    >
                      <Link
                        href={`/dashboard/messages?to=${encodeURIComponent(awardee.profile_id)}&name=${encodeURIComponent(awardee.name)}`}
                        title={`Message ${awardee.name}`}
                      >
                        <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={2.6} />
                        Message
                      </Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      disabled
                      title={
                        messagingRestricted
                          ? 'Messaging is paused for your membership'
                          : 'Not on the member platform yet'
                      }
                      className="h-10 rounded-full border border-black/10 bg-white px-4 text-sm font-semibold text-black/75 shadow-none disabled:opacity-50"
                    >
                      <MessageCircle className="mr-1.5 h-4 w-4" strokeWidth={2.6} />
                      Message
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>

          {loading ? (
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
              {[0, 1, 2].map((row) => (
                <div key={row} className="animate-pulse rounded-[22px] border border-black/5 bg-white p-4">
                  <div className="flex items-start gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-orange-100/70" />
                    <div className="flex-1 space-y-2 pt-1">
                      <div className="h-3.5 w-1/2 rounded-full bg-orange-100/70" />
                      <div className="h-3 w-4/5 rounded-full bg-orange-50" />
                    </div>
                  </div>
                  <div className="mt-5 h-9 rounded-full bg-orange-50" />
                </div>
              ))}
            </div>
          ) : null}

          {!loading && loadFailed ? (
            <div className="mt-4 rounded-[22px] border border-orange-100 bg-white p-8 text-center">
              <p className="text-sm font-semibold text-orange-700">Could not load the awardee directory.</p>
              <Button
                type="button"
                variant="outline"
                className="mt-4 rounded-full border-orange-200 bg-white text-black hover:bg-orange-50"
                onClick={() => setReloadKey((key) => key + 1)}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            </div>
          ) : null}

          {!loading && !loadFailed && visibleAwardees.length === 0 ? (
            <div className="mt-4 rounded-[22px] border border-dashed border-black/10 bg-white p-8 text-center text-sm font-semibold text-black/50">
              No awardees match this filter yet.
            </div>
          ) : null}

          {filteredAwardees.length > visibleAwardees.length ? (
            <p className="mt-4 text-center text-sm font-semibold text-black/45">
              <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="mr-4 rounded-xl border px-3 disabled:opacity-40">Previous</button>
              Page {currentPage + 1} of {pageCount}
              <button disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} className="ml-4 rounded-xl border px-3 disabled:opacity-40">Next</button>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function DirectoryRecoveryCard({ status }: { status: 'suspended' | 'rejected' }) {
  return (
    <div role="alert" className="rounded-[22px] border border-red-200 bg-red-50 p-5 text-red-950">
      <div className="flex items-start gap-3">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-sm font-bold">
            {status === 'suspended' ? 'Messaging is paused' : 'Messaging is not available'}
          </p>
          <p className="mt-1 text-sm font-medium leading-6 text-red-900/80">
            {status === 'suspended'
              ? 'Your membership is suspended. You can still browse awardee profiles, but direct messages stay disabled until the AFL team restores access.'
              : 'Your membership was not approved. You can still browse awardee profiles, but direct messages are unavailable. Contact the AFL team if you believe this needs review.'}
          </p>
        </div>
      </div>
    </div>
  )
}

function getInitials(name: string) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'AF'
  )
}
