'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { festivalRequest } from '@/lib/festival/client'
import type { FestivalInterestList } from '@/lib/festival/interest'

export default function FestivalAdminPage() {
  const [page, setPage] = useState(1)
  const [view, setView] = useState<FestivalInterestList | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    festivalRequest<FestivalInterestList>(
      `/api/admin/festival-interest?page=${page}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setView(data)
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          setError(
            cause instanceof Error
              ? cause.message
              : 'Responses could not be loaded.',
          )
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [page, retry])
  function reload(nextPage = page) {
    setLoading(true)
    setError('')
    setPage(nextPage)
    setRetry((value) => value + 1)
  }
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Africa Future Leaders Festival 2026"
        title="Festival interest"
        description="Attendance interest and physical award pickup requests from members."
        actions={
          <button
            type="button"
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-neutral-300 bg-white px-4 text-sm"
            disabled={loading}
            onClick={() => reload()}
          >
            <RefreshCw size={16} aria-hidden="true" /> Refresh
          </button>
        }
      />
      <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-neutral-700">
        Pickup choices are requests. Review verified payment and fulfillment in{' '}
        <Link className="underline underline-offset-4" href="/admin/awards">
          Awards
        </Link>{' '}
        before confirming collection.
      </p>
      {loading ? (
        <p role="status" className="py-8 text-sm text-neutral-600">
          Loading festival responses…
        </p>
      ) : error ? (
        <div
          role="alert"
          className="space-y-3 rounded-xl border border-red-200 p-4"
        >
          <p>{error}</p>
          <button
            type="button"
            className="min-h-11 underline"
            onClick={() => reload()}
          >
            Try again
          </button>
        </div>
      ) : (
        view && (
          <>
            <p className="text-sm text-neutral-600">
              {view.total.toLocaleString()}{' '}
              {view.total === 1 ? 'member has' : 'members have'} registered
              interest
            </p>
            {view.interests.length === 0 ? (
              <p className="py-10 text-neutral-500">
                {view.total
                  ? 'No responses on this page.'
                  : 'No interest registered yet.'}
              </p>
            ) : (
              <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white px-5">
                {view.interests.map((interest) => (
                  <li
                    key={interest.memberId}
                    className="grid gap-4 py-5 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)]"
                  >
                    <div className="min-w-0">
                      <p className="break-words font-medium">
                        {interest.fullName}
                      </p>
                      <a
                        className="mt-1 inline-flex min-h-11 items-center text-sm text-neutral-600 underline underline-offset-4"
                        href={`tel:${interest.phone}`}
                      >
                        {interest.phone}
                      </a>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">
                        Physical award pickup
                      </p>
                      <p className="mt-1 text-sm">
                        {interest.pickupRequested
                          ? 'Requested at festival'
                          : 'Not requested'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">Last updated</p>
                      <p className="mt-1 text-sm">
                        {new Intl.DateTimeFormat('en', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(interest.updatedAt))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )
      )}
      <nav
        aria-label="Festival response pages"
        className="flex flex-wrap items-center justify-between gap-3 text-sm"
      >
        <button
          type="button"
          className="min-h-11 rounded-lg border border-neutral-300 px-4 disabled:opacity-40"
          disabled={loading || page <= 1}
          onClick={() => reload(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page}
          {view && !loading && !error
            ? ` of ${Math.max(1, Math.ceil(view.total / view.pageSize))}`
            : ''}
        </span>
        <button
          type="button"
          className="min-h-11 rounded-lg border border-neutral-300 px-4 disabled:opacity-40"
          disabled={
            loading || !!error || !view || page * view.pageSize >= view.total
          }
          onClick={() => reload(page + 1)}
        >
          Next
        </button>
      </nav>
    </div>
  )
}
