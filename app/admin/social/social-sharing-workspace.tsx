'use client'

import { useEffect, useState } from 'react'
import {
  Search,
  LoaderCircle,
  ArrowLeft,
  ArrowRight,
  PenLine,
  ListChecks,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  SOCIAL_PLATFORM_LABELS,
  type PublicAwardee,
  type SocialShareDraft,
} from '@/lib/admin-social/types'
import SpotlightComposer from './spotlight-composer'
import { readSocialResponse as readResponse } from '@/lib/admin-social/client'

export type FeatureProfile = PublicAwardee & { signature: string }
export default function SocialSharingWorkspace() {
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'write' | 'tracker'>('write')
  const [pickerOpen, setPickerOpen] = useState(true)
  const [browsing, setBrowsing] = useState(false)
  const [page, setPage] = useState(1)
  const [directory, setDirectory] = useState<{
    awardees: FeatureProfile[]
    total: number
    hasMore: boolean
  } | null>(null)
  const [selected, setSelected] = useState<FeatureProfile | null>(null)
  const [entry, setEntry] = useState<SocialShareDraft | null>(null)
  const [dirty, setDirty] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [loading, setLoading] = useState(false)
  const [revision, setRevision] = useState(0)
  const [status, setStatus] = useState('draft')
  const [historyPage, setHistoryPage] = useState(1)
  const [records, setRecords] = useState<{
    drafts: SocialShareDraft[]
    total: number
    hasMore: boolean
  } | null>(null)
  const [historyError, setHistoryError] = useState('')
  const [opening, setOpening] = useState(false)

  useEffect(() => {
    if (query.trim().length < 2 && !browsing) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      setLoading(true)
      setSearchError('')
      setDirectory(null)
      fetch(
        `/api/admin/social/awardees?q=${encodeURIComponent(query.trim())}&page=${page}`,
        { signal: controller.signal },
      )
        .then(readResponse)
        .then((data) => {
          if (!controller.signal.aborted) setDirectory(data)
        })
        .catch((error) => {
          if (!controller.signal.aborted) setSearchError(error.message)
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, page, revision, browsing])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/admin/social/drafts?status=${status}&page=${historyPage}`, {
      signal: controller.signal,
    })
      .then(readResponse)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRecords(data)
          setHistoryError('')
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setHistoryError(error.message)
      })
    return () => controller.abort()
  }, [status, historyPage, revision])

  const choose = (profile: FeatureProfile) => {
    if (opening) return
    if (profile.awardeeId === selected?.awardeeId) {
      setPickerOpen(false)
      return
    }
    if (
      dirty &&
      !window.confirm(
        'Discard unsaved feature edits and choose another awardee?',
      )
    )
      return
    setEntry(null)
    setSelected(profile)
    setPickerOpen(false)
    setDirty(false)
  }
  const openRecord = async (record: SocialShareDraft) => {
    if (
      dirty &&
      !window.confirm('Discard unsaved feature edits and open this awardee?')
    )
      return
    setOpening(true)
    setHistoryError('')
    try {
      const data = await readResponse(
        await fetch(`/api/admin/social/awardees?awardeeId=${record.awardeeId}`),
      )
      if (!data.awardees?.[0])
        throw new Error('This awardee no longer has a public profile.')
      setEntry(record)
      setSelected(data.awardees[0])
      setView('write')
      setPickerOpen(false)
      setDirty(false)
    } catch (error) {
      setHistoryError(
        error instanceof Error ? error.message : 'Could not open awardee.',
      )
    } finally {
      setOpening(false)
    }
  }
  return (
    <div className="space-y-4">
      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Feature workspace"
      >
        <Button
          variant={view === 'write' ? 'default' : 'outline'}
          aria-pressed={view === 'write'}
          onClick={() => setView('write')}
        >
          <PenLine className="size-4" />
          Editor
        </Button>
        <Button
          variant={view === 'tracker' ? 'default' : 'outline'}
          aria-pressed={view === 'tracker'}
          onClick={() => setView('tracker')}
        >
          <ListChecks className="size-4" />
          Drafts &amp; posts
        </Button>
      </div>
      <div hidden={view !== 'write'} className="space-y-5">
        <section
          className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-5"
          hidden={!!selected && !pickerOpen}
          aria-label="Choose an awardee"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <label
                htmlFor="awardee-search"
                className="font-medium text-stone-900"
              >
                Find an awardee
              </label>
            </div>
            {selected && (
              <Button variant="ghost" onClick={() => setPickerOpen(false)}>
                Back to the feature
              </Button>
            )}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-3 size-5 text-stone-400" />
              <input
                id="awardee-search"
                type="search"
                value={query}
                maxLength={80}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(1)
                  setDirectory(null)
                  setSearchError('')
                  setLoading(event.target.value.trim().length >= 2 || browsing)
                }}
                placeholder="Type at least two letters of a name"
                className="h-11 w-full rounded-lg border border-stone-300 bg-white pl-10 pr-3 text-base focus-visible:outline-orange-600"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setBrowsing(true)
                setLoading(true)
                setRevision((value) => value + 1)
              }}
            >
              Browse directory
            </Button>
          </div>
          {loading && (
            <p role="status" className="mt-4 text-sm text-stone-500">
              Finding awardees…
            </p>
          )}
          {searchError && (
            <p role="alert" className="mt-4 text-sm text-red-700">
              {searchError}{' '}
              <button
                className="underline"
                onClick={() => setRevision((value) => value + 1)}
              >
                Retry
              </button>
            </p>
          )}
          {!loading && directory && (
            <>
              <div
                className="mt-4 max-h-72 divide-y divide-stone-100 overflow-y-auto rounded-lg border border-stone-200"
                aria-label="Awardee search results"
              >
                {directory.awardees.map((profile) => (
                  <button
                    key={profile.awardeeId}
                    type="button"
                    disabled={opening}
                    onClick={() => choose(profile)}
                    className="flex min-h-12 w-full items-center justify-between gap-4 px-3 py-3 text-left hover:bg-orange-50 focus-visible:outline-orange-600"
                  >
                    <span className="min-w-0">
                      <span className="block break-words text-sm font-medium text-stone-900">
                        {profile.name}
                      </span>
                      <span className="mt-1 block text-xs text-stone-500">
                        {[profile.country, profile.year]
                          .filter(Boolean)
                          .join(' · ') || 'Public awardee'}
                        {!profile.bio ? ' · Needs a public bio' : ''}
                      </span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-stone-400" />
                  </button>
                ))}
              </div>
              {!directory.awardees.length && (
                <p className="mt-4 text-sm text-stone-500">
                  No public profiles match that name. Try a first name or
                  surname.
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-stone-500">
                <span>
                  {directory.total} matching profiles · Page {page}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((value) => value - 1)}
                    disabled={page === 1}
                  >
                    <ArrowLeft className="size-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((value) => value + 1)}
                    disabled={!directory.hasMore}
                  >
                    Next
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </section>
        {selected && (
          <div hidden={pickerOpen}>
            <SpotlightComposer
              key={entry?.id ?? selected.awardeeId}
              profile={selected}
              initialPlatform={entry?.platform}
              initialView={
                entry
                  ? entry.status === 'marked_posted'
                    ? 'publish'
                    : 'channels'
                  : undefined
              }
              onChooseAnother={() => setPickerOpen(true)}
              onDirty={setDirty}
              onSaved={() => {
                setRecords(null)
                setHistoryError('')
                setRevision((value) => value + 1)
              }}
            />
          </div>
        )}
      </div>
      <section
        hidden={view !== 'tracker'}
        className="rounded-2xl border border-stone-200 bg-white p-4 sm:p-6"
        aria-label="Feature tracker"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-stone-900">Feature tracker</h2>
            <p className="mt-1 text-sm text-stone-600">
              Saved drafts and posts recorded by your team, across all awardees.
            </p>
          </div>
          <div className="flex gap-2">
            {[
              ['draft', 'Drafts'],
              ['marked_posted', 'Posted'],
            ].map(([value, label]) => (
              <Button
                key={value}
                variant={status === value ? 'default' : 'outline'}
                aria-pressed={status === value}
                onClick={() => {
                  if (status === value && historyPage === 1) return
                  setRecords(null)
                  setHistoryError('')
                  setStatus(value)
                  setHistoryPage(1)
                }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>
        {historyError && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {historyError}{' '}
            <button
              className="underline"
              onClick={() => setRevision((value) => value + 1)}
            >
              Retry
            </button>
          </p>
        )}
        {!records && !historyError && (
          <p role="status" className="mt-4 text-sm text-stone-500">
            Loading records…
          </p>
        )}
        {records && (
          <>
            <div className="mt-4 divide-y divide-stone-100">
              {records.drafts.map((record) => (
                <div
                  key={record.id}
                  className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div className="min-w-0">
                    <p className="break-words font-medium text-stone-900">
                      {record.publicSnapshot.name}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">
                      {SOCIAL_PLATFORM_LABELS[record.platform]} ·{' '}
                      {status === 'draft'
                        ? 'Draft saved'
                        : 'Posted · recorded by admin'}{' '}
                      ·{' '}
                      {new Date(
                        record.markedPostedAt ?? record.updatedAt,
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {record.publicPostUrl && (
                      <a
                        href={record.publicPostUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-11 items-center text-sm text-orange-800 underline"
                      >
                        View live post
                      </a>
                    )}
                    <Button
                      variant="outline"
                      disabled={opening}
                      onClick={() => void openRecord(record)}
                    >
                      {opening ? (
                        <LoaderCircle className="size-4 animate-spin" />
                      ) : null}
                      Open awardee
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {!records.drafts.length && (
              <p className="mt-4 text-sm text-stone-500">
                {status === 'draft'
                  ? 'No saved drafts yet. Choose an awardee to prepare the first feature.'
                  : 'No posts recorded yet. Record each live post after publishing.'}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm text-stone-600">
              <span>
                {records.total}{' '}
                {status === 'draft' ? 'drafts' : 'recorded posts'} · Page{' '}
                {historyPage}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  disabled={historyPage === 1}
                  onClick={() => {
                    setRecords(null)
                    setHistoryError('')
                    setHistoryPage((value) => value - 1)
                  }}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  disabled={!records.hasMore}
                  onClick={() => {
                    setRecords(null)
                    setHistoryError('')
                    setHistoryPage((value) => value + 1)
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
