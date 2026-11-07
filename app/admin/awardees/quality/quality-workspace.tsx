'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Link2, Search } from 'lucide-react'
import { QUALITY_BATCH_SIZE, type LinkResult, type QualityFilter, type QualityRow } from '@/lib/admin/profile-quality'

import { SITE_URL } from '@/lib/site'

const PAGE_SIZE = 25
const categories: { value: QualityFilter; label: string }[] = [
  { value: 'all', label: 'All profiles' },
  { value: 'bio', label: 'Missing bio' },
  { value: 'headline', label: 'Missing headline' },
  { value: 'photo', label: 'Missing photo' },
  { value: 'broken', label: 'Broken links' },
  { value: 'review', label: 'Needs review' },
]

const control = 'min-h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50'

async function waitForRetry(ms: number, signal: AbortSignal) {
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason)
    const abort = () => {
      clearTimeout(timer)
      reject(signal.reason)
    }
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, ms)
    signal.addEventListener('abort', abort, { once: true })
  })
}

export default function QualityWorkspace({ rows }: { rows: QualityRow[] }) {
  const [filter, setFilter] = useState<QualityFilter>('all')
  const [search, setSearch] = useState('')
  const [year, setYear] = useState('')
  const [page, setPage] = useState(1)
  const [checks, setChecks] = useState<Record<string, LinkResult[]>>({})
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)
  const active = useRef<AbortController | null>(null)
  useEffect(() => () => active.current?.abort(), [])

  const years = [...new Set(rows.flatMap(row => row.year ? [row.year] : []))].sort().reverse()
  const slugCounts = new Map<string, number>()
  for (const { slug } of rows) if (slug) slugCounts.set(slug, (slugCounts.get(slug) ?? 0) + 1)
  const qualityRows = rows.map(row => {
    const links = checks[row.id] ?? row.invalidLinks
    const broken = links.some(link => link.status === 'broken')
    const details = [...row.details]
    if (row.slug && (slugCounts.get(row.slug) ?? 0) > 1) details.push('Public profile URL is shared by multiple records')
    const review = details.length > 0 || links.some(link => link.status === 'review')
    return { ...row, details, links, broken, review }
  })
  const matches = (row: typeof qualityRows[number], category: QualityFilter) => {
    switch (category) {
      case 'bio': return row.missingBio
      case 'headline': return row.missingHeadline
      case 'photo': return row.missingPhoto
      case 'broken': return row.broken
      case 'review': return row.review
      default: return true
    }
  }
  const query = search.trim().toLowerCase()
  const scope = qualityRows.filter(row =>
    (!year || row.year === year) && (!query || `${row.name} ${row.slug ?? ''} ${row.slug ? `${SITE_URL}/awardees/${row.slug}` : ''}`.toLowerCase().includes(query)),
  )
  const filtered = scope.filter(row => matches(row, filter))
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const current = Math.min(page, pageCount)
  const visible = filtered.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)

  async function scan(ids: string[]) {
    if (active.current || ids.length === 0) return
    const controller = new AbortController()
    active.current = controller
    setChecking(true)
    setError('')
    let completed = 0
    setProgress(`Checking 0 of ${ids.length} profiles…`)
    try {
      for (let offset = 0; offset < ids.length; offset += QUALITY_BATCH_SIZE) {
        const batch = ids.slice(offset, offset + QUALITY_BATCH_SIZE)
        const request = () => fetch('/api/admin/awardees/quality/links', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: batch }),
          signal: controller.signal,
        })
        let response = await request()
        if (response.status === 429) {
          const seconds = Number(response.headers.get('Retry-After')) || 60
          await response.body?.cancel()
          setProgress(`Checked ${completed} of ${ids.length} profiles. Waiting to resume…`)
          await waitForRetry(Math.min(Math.max(seconds, 1), 60) * 1000, controller.signal)
          response = await request()
        }
        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Could not finish checking links.')
        setChecks(previous => ({ ...previous, ...data.results }))
        completed += Object.keys(data.results).length
        setProgress(`Checked ${completed} of ${ids.length} profiles`)
      }
    } catch (failure) {
      if (controller.signal.aborted) setProgress(`Stopped after ${completed} of ${ids.length} profiles`)
      else setError(failure instanceof Error ? failure.message : 'Could not finish checking links.')
    } finally {
      active.current = null
      setChecking(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2" aria-label="Filter by issue">
        {categories.map(category => (
          <button
            type="button" key={category.value} aria-pressed={filter === category.value}
            className={`${control} ${filter === category.value ? '!border-amber-400 !bg-amber-50' : ''}`}
            onClick={() => { setFilter(category.value); setPage(1) }}
          >
            {category.label} <span className="ml-1 tabular-nums text-zinc-500">{scope.filter(row => matches(row, category.value)).length}</span>
          </button>
        ))}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-white" aria-label="Profile review queue">
        <div className="space-y-3 border-b border-zinc-200 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search by name or profile URL</span>
              <Search className="absolute left-3 top-3.5 size-4 text-zinc-400" aria-hidden="true" />
              <input value={search} onChange={event => { setSearch(event.target.value); setPage(1) }}
                placeholder="Search by name or profile URL" className="min-h-11 w-full rounded-lg border border-zinc-200 py-2 pl-9 pr-3 text-sm" />
            </label>
            <label>
              <span className="sr-only">Cohort</span>
              <select value={year} onChange={event => { setYear(event.target.value); setPage(1) }} className={`${control} w-full lg:w-auto`}>
                <option value="">All cohorts</option>
                {years.map(value => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={control} disabled={checking || !visible.some(row => row.linkCount)}
                onClick={() => void scan(visible.filter(row => row.linkCount).map(row => row.id))}>
                <Link2 className="mr-1 inline size-4" aria-hidden="true" /> Check page links
              </button>
              {checking ? (
                <button type="button" className={control} onClick={() => active.current?.abort()}>Stop check</button>
              ) : (
                <button type="button" className={control} disabled={!scope.some(row => row.linkCount && !checks[row.id])}
                  onClick={() => void scan(scope.filter(row => row.linkCount && !checks[row.id]).map(row => row.id))}>
                  Check remaining links
                </button>
              )}
            </div>
          </div>
          <p className="text-xs leading-5 text-zinc-600">
            Link checks cover saved photos, public social links and up to 12 achievement links per profile. Results are kept while this page is open.
          </p>
          <p role="status" className="text-sm text-zinc-600">
            {progress || `${scope.filter(row => checks[row.id]).length} of ${scope.filter(row => row.linkCount).length} profiles with links checked`}
          </p>
          {error && <p role="alert" className="text-sm text-red-700">{error} Completed checks are still available.</p>}
        </div>

        {visible.length === 0 ? (
          <p className="p-6 text-sm text-zinc-600">
            {filter === 'broken' ? 'No broken links found in the results available so far. Run a link check to review saved addresses.' : 'No profiles match these filters.'}
          </p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {visible.map(row => {
              const issues = [
                row.missingBio && 'Missing bio',
                row.missingHeadline && 'Missing specific headline',
                row.missingPhoto && 'Missing photo',
                ...row.details,
              ].filter(Boolean)
              const linkIssues = row.links.filter(link => link.status !== 'working')
              return (
                <li key={row.id} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] md:items-start">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-zinc-950">{row.name}</p>
                    <p className="mt-1 text-xs text-zinc-500">{row.year ? `Class of ${row.year}` : 'Cohort unconfirmed'}</p>
                    {row.slug && <Link href={`/awardees/${encodeURIComponent(row.slug)}`} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1 text-sm text-zinc-600 hover:underline">
                      Public profile <ArrowUpRight className="size-3" aria-hidden="true" />
                    </Link>}
                  </div>
                  <div className="min-w-0 space-y-2 text-sm text-zinc-700">
                    {issues.length > 0 && <ul className="space-y-1">{issues.map(issue => <li key={String(issue)}>{issue}</li>)}</ul>}
                    {linkIssues.length > 0 && (
                      <details>
                        <summary className="min-h-11 cursor-pointer py-3 font-medium">{linkIssues.length} link {linkIssues.length === 1 ? 'issue' : 'issues'}</summary>
                        <ul className="space-y-2 pb-2">
                          {linkIssues.map((link, index) => <li key={index} className="break-words">
                            <span className={link.status === 'broken' ? 'font-medium text-red-700' : 'font-medium text-amber-800'}>
                              {link.status === 'broken' ? 'Broken' : 'Needs review'}
                            </span>
                            {' · '}{link.label}{link.host ? ` · ${link.host}` : ''}<br />{link.reason}
                          </li>)}
                        </ul>
                      </details>
                    )}
                    {!issues.length && !linkIssues.length && <p className="text-zinc-600">Profile details complete</p>}
                    <p className="text-xs text-zinc-500">
                      {checks[row.id] ? `${checks[row.id].filter(link => link.status === 'working').length} links reachable` : row.linkCount ? `${row.linkCount} ${row.linkCount === 1 ? 'link' : 'links'} to check` : 'No saved links to check'}
                    </p>
                  </div>
                  <Link href={`/admin/awardees/edit/${encodeURIComponent(row.id)}`} className={`${control} inline-flex items-center justify-center`}>
                    Edit awardee record
                  </Link>
                </li>
              )
            })}
          </ul>
        )}

        <nav aria-label="Profile quality pagination" className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 p-4">
          <span className="text-sm text-zinc-600">{filtered.length} {filtered.length === 1 ? 'profile' : 'profiles'} · Page {current} of {pageCount}</span>
          <div className="flex gap-2">
            <button type="button" className={control} disabled={current <= 1} onClick={() => setPage(current - 1)}>Previous</button>
            <button type="button" className={control} disabled={current >= pageCount} onClick={() => setPage(current + 1)}>Next</button>
          </div>
        </nav>
      </section>
    </div>
  )
}
