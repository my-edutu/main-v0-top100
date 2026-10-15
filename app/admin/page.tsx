'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowUpRight,
  Award,
  BarChart3,
  Bell,
  Calendar,
  FileText,
  Globe2,
  KeyRound,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Users,
  Youtube,
  type LucideIcon,
} from 'lucide-react'

import PageHeader from './components/PageHeader'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const ADMIN_ENABLED = true

type MetricValue = number | null

interface Stats {
  totalAwardees: MetricValue
  totalCountries: MetricValue
  totalPosts: MetricValue
  publishedPosts: MetricValue
  totalYouTubeVideos: MetricValue
  recentAwardees: MetricValue
  totalEvents: MetricValue
  totalUsers: MetricValue
  draftPosts: MetricValue
  recentVideos: MetricValue
}

type StatsKey = keyof Stats

type WorkspaceCard = {
  title: string
  description: string
  href: string
  icon: LucideIcon
  stat?: StatsKey
  statLabel?: string
  tone: 'orange' | 'gold' | 'lilac' | 'sage' | 'peach' | 'sand' | 'rose' | 'lavender' | 'mint'
}

const workspaceCards: WorkspaceCard[] = [
  { title: 'Awardees', description: 'Review profiles, visibility, cohorts, and featured leaders.', href: '/admin/awardees', icon: Users, stat: 'totalAwardees', statLabel: 'leaders', tone: 'orange' },
  { title: 'Awards & delivery', description: 'Track verified payments, shipping quotes, and dispatch exceptions.', href: '/admin/awards', icon: Award, tone: 'lilac' },
  { title: 'Invites', description: 'Create claim codes and guide awardees into the member workspace.', href: '/admin/invites', icon: KeyRound, tone: 'gold' },
  { title: 'Member Hub', description: 'Review members, submissions, and dashboard communications.', href: '/admin/member-hub', icon: Bell, stat: 'totalUsers', statLabel: 'accounts', tone: 'sage' },
  { title: 'Editorial', description: 'Create and publish stories from across the Top100 community.', href: '/admin/blog', icon: FileText, stat: 'totalPosts', statLabel: 'posts', tone: 'peach' },
  { title: 'Programs', description: 'Manage events, summits, webinars, and member invitations.', href: '/admin/events', icon: Calendar, stat: 'totalEvents', statLabel: 'programs', tone: 'sand' },
  { title: 'Channel', description: 'Curate interviews and video stories for the public platform.', href: '/admin/youtube', icon: Youtube, stat: 'totalYouTubeVideos', statLabel: 'videos', tone: 'rose' },
  { title: 'Insights', description: 'Understand the real reach and activity recorded by the platform.', href: '/admin/analytics', icon: BarChart3, tone: 'lavender' },
  { title: 'Settings', description: 'Manage platform preferences and operational integrations.', href: '/admin/settings', icon: Settings, tone: 'mint' },
]

function asArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null
}

function readObjectArray(value: unknown, key: string): unknown[] | null {
  if (Array.isArray(value)) return value
  if (!value || typeof value !== 'object') return null
  return asArray((value as Record<string, unknown>)[key])
}

function stringField(value: unknown, key: string): string {
  if (!value || typeof value !== 'object') return ''
  const field = (value as Record<string, unknown>)[key]
  return typeof field === 'string' ? field : ''
}

function recentCount(rows: unknown[] | null): MetricValue {
  if (!rows) return null
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  return rows.filter((row) => {
    const createdAt = Date.parse(stringField(row, 'created_at'))
    return Number.isFinite(createdAt) && createdAt > weekAgo
  }).length
}

function displayMetric(value: MetricValue) {
  return value === null ? '—' : new Intl.NumberFormat('en').format(value)
}

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true)
  const [partialFailure, setPartialFailure] = useState(false)
  const [stats, setStats] = useState<Stats>({
    totalAwardees: null,
    totalCountries: null,
    totalPosts: null,
    publishedPosts: null,
    totalYouTubeVideos: null,
    recentAwardees: null,
    totalEvents: null,
    totalUsers: null,
    draftPosts: null,
    recentVideos: null,
  })
  const [cohorts, setCohorts] = useState<[string, number][]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const fetchStats = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    if (withSpinner) setLoading(true)

    let failed = false
    const load = async (url: string, apply: (payload: unknown) => void) => {
      try {
        const response = await fetch(url, { cache: 'no-store' })
        if (!response.ok) throw new Error(`Request failed: ${url}`)
        apply(await response.json())
      } catch {
        failed = true
      }
    }

    await Promise.all([
      load('/api/awardees?scope=admin', (payload) => {
        const awardees = readObjectArray(payload, 'awardees')
        if (!awardees) throw new Error('Directory totals are unavailable.')
        const counts = new Map<string, number>()
        for (const row of awardees) {
          const year = String((row as Record<string, unknown>).year || 'Unspecified')
          counts.set(year, (counts.get(year) ?? 0) + 1)
        }
        setCohorts([...counts].sort(([a], [b]) => a.localeCompare(b)))
        setStats((current) => ({
          ...current,
          totalAwardees: awardees.length,
          totalCountries: new Set(awardees.map((row) => stringField(row, 'country').trim()).filter(Boolean)).size,
          recentAwardees: recentCount(awardees),
        }))
      }),
      load('/api/events?scope=admin', (payload) => {
        const events = readObjectArray(payload, 'events')
        if (!events) throw new Error('Programme totals are unavailable.')
        setStats((current) => ({ ...current, totalEvents: events.length }))
      }),
      load('/api/posts?scope=admin', (payload) => {
        const posts = readObjectArray(payload, 'posts')
        if (!posts) throw new Error('Editorial totals are unavailable.')
        const publishedPosts = posts.filter((row) => stringField(row, 'status') === 'published').length
        const draftPosts = posts.filter((row) => stringField(row, 'status') === 'draft').length
        setStats((current) => ({ ...current, totalPosts: posts.length, publishedPosts, draftPosts }))
      }),
      load('/api/youtube', (payload) => {
        const videos = readObjectArray(payload, 'videos')
        if (!videos) throw new Error('Channel totals are unavailable.')
        setStats((current) => ({ ...current, totalYouTubeVideos: videos.length, recentVideos: recentCount(videos) }))
      }),
      load('/api/users?count=exact', (payload) => {
        if (!payload || typeof payload !== 'object' || typeof (payload as Record<string, unknown>).count !== 'number') {
          throw new Error('Account total is unavailable.')
        }
        setStats((current) => ({ ...current, totalUsers: (payload as Record<string, number>).count }))
      }),
    ])
    setPartialFailure(failed)
    setUpdatedAt(new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }, [])

  useEffect(() => {
    void fetchStats()
    const interval = window.setInterval(() => { if (!document.hidden) void fetchStats({ withSpinner: false }) }, 60_000)
    return () => window.clearInterval(interval)
  }, [fetchStats])

  if (!ADMIN_ENABLED) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-6 text-center">
        <div className="admin-panel max-w-xl space-y-4 p-8">
          <h1 className="text-2xl font-semibold text-zinc-900">Admin console offline</h1>
          <p className="text-sm leading-6 text-zinc-500">Internal tooling is paused while we prepare the public launch.</p>
          <Button asChild><Link href="/">Back to homepage</Link></Button>
        </div>
      </div>
    )
  }

  const headlineMetrics = [
    { label: 'Leaders', value: stats?.totalAwardees ?? null, detail: `${displayMetric(stats?.recentAwardees ?? null)} added this week`, icon: Users },
    { label: 'Countries', value: stats?.totalCountries ?? null, detail: 'Represented in the directory', icon: Globe2 },
    { label: 'Published stories', value: stats?.publishedPosts ?? null, detail: `${displayMetric(stats?.draftPosts ?? null)} drafts awaiting work`, icon: FileText },
    { label: 'Platform accounts', value: stats?.totalUsers ?? null, detail: 'Registered platform users', icon: KeyRound },
  ]
  const otherPosts = Math.max(0, (stats?.totalPosts ?? 0) - (stats?.publishedPosts ?? 0) - (stats?.draftPosts ?? 0))

  return (
    <div className="admin-overview space-y-6 pb-4">
      <PageHeader
        eyebrow="Top100 workspace"
        title="Let’s move things forward."
        description="Your people, your programmes, and what needs your attention."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void fetchStats()} disabled={loading} className="rounded-xl border-zinc-200 bg-white font-medium text-zinc-700 shadow-none">
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden="true" />
              Refresh
            </Button>
            <Button asChild size="sm" className="overview-primary rounded-xl bg-[#181715] font-medium text-white shadow-none hover:bg-zinc-800">
              <Link href="/admin/awardees/new"><Plus className="size-4" aria-hidden="true" />Add awardee</Link>
            </Button>
          </>
        }
      />

      {partialFailure ? (
        <div role="status" className="admin-panel flex items-start gap-3 border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
          <span className="mt-1 size-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          <p>Some live totals are unavailable. Available workspaces remain usable, and this overview will retry automatically.</p>
        </div>
      ) : null}

      <section aria-labelledby="snapshot-heading" className="space-y-3">
        <div className="flex items-end justify-between gap-4">
          <div><h2 id="snapshot-heading" className="text-sm font-medium text-zinc-600">Platform snapshot {updatedAt && <span className="ml-2 text-xs text-zinc-500">Updated {updatedAt}</span>}</h2></div>
          {loading ? <Loader2 className="size-4 animate-spin text-zinc-400" aria-label="Refreshing totals" /> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {headlineMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className="admin-panel overview-metric min-w-0 p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="text-xs font-medium text-zinc-500">{metric.label}</p><p className="mt-2 text-2xl font-semibold tabular-nums tracking-[-0.04em] text-zinc-950 sm:text-3xl">{displayMetric(metric.value)}</p></div>
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-orange-50 text-orange-700"><Icon className="size-[18px]" strokeWidth={1.9} aria-hidden="true" /></span>
                </div>
                <p className="mt-3 text-xs leading-5 text-zinc-500">{metric.detail}</p>
              </article>
            )
          })}
        </div>
      </section>

      <div className="overview-bento">
        <section className="admin-panel overview-chart overview-chart--cohorts" aria-labelledby="cohort-title">
          <div className="overview-chart-heading"><div><p className="admin-kicker">Our community</p><h2 id="cohort-title">Leaders by cohort</h2></div><Users size={20} /></div>
          <p className="overview-chart-caption">Directory leaders grouped by award year.</p>
          {stats?.totalAwardees != null ? <div className="overview-chart-total"><strong>{displayMetric(stats.totalAwardees)}</strong><span>leaders across {cohorts.length} cohorts</span></div> : null}
          {stats?.totalAwardees == null ? <p className="py-8 text-sm">{loading ? 'Loading directory…' : 'Directory data unavailable.'}</p> : !cohorts.length ? <p className="py-8 text-sm">No directory entries yet.</p> : <div className="overview-bars">{cohorts.map(([year, count]) => {
            const percentage = Math.round(count / Math.max(stats.totalAwardees ?? 0, 1) * 100)
            return <div className="overview-cohort-row" key={year}>
              <div className="overview-cohort-label"><span>{year}</span><strong className="tabular-nums">{displayMetric(count)}</strong><small>{percentage}%</small></div>
              <div className="overview-bar-track" role="progressbar" aria-label={`${year} cohort share`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percentage}><div style={{ width: `${percentage}%` }} /></div>
            </div>
          })}</div>}
          <Link className="overview-text-link" href="/admin/awardees">Explore directory <ArrowUpRight size={16} /></Link>
        </section>
        <section className="admin-panel overview-chart overview-chart--publishing" aria-labelledby="publishing-title">
          <div className="overview-chart-heading"><div><p className="admin-kicker">Editorial pulse</p><h2 id="publishing-title">Stories in motion</h2></div><FileText size={20} /></div>
          <p className="overview-chart-caption">A live view of what is published and what still needs work.</p>
          {stats?.totalPosts == null ? <p className="py-8 text-sm">{loading ? 'Loading stories…' : 'Editorial data unavailable.'}</p> : <>
            <div className="overview-publishing-total"><strong>{displayMetric(stats.totalPosts)}</strong><span>stories in the library</span></div>
            <div className="overview-publishing-bar" role="img" aria-label={`${displayMetric(stats.publishedPosts)} published, ${displayMetric(stats.draftPosts)} drafts, ${displayMetric(otherPosts)} other`}><span style={{width:`${(stats.publishedPosts ?? 0) / Math.max(stats.totalPosts, 1) * 100}%`}} /><span style={{width:`${(stats.draftPosts ?? 0) / Math.max(stats.totalPosts, 1) * 100}%`}} /><span style={{width:`${otherPosts / Math.max(stats.totalPosts, 1) * 100}%`}} /></div>
            <div className="overview-legend">
              <div><span className="overview-status-dot overview-status-dot--published" /><span>Published</span><b>{displayMetric(stats.publishedPosts)}</b></div>
              <div><span className="overview-status-dot overview-status-dot--draft" /><span>Drafts</span><b>{displayMetric(stats.draftPosts)}</b></div>
              <div><span className="overview-status-dot overview-status-dot--other" /><span>Other</span><b>{displayMetric(otherPosts)}</b></div>
            </div>
          </>}
          <Link className="overview-text-link" href="/admin/blog">Open editorial <ArrowUpRight size={16} /></Link>
        </section>
      </div>

      <section aria-labelledby="workspaces-heading" className="space-y-3">
        <div><h2 id="workspaces-heading" className="text-lg font-semibold tracking-tight text-zinc-950">Your workspaces</h2><p className="mt-1 text-sm text-zinc-500">Everything you need, one step away.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {workspaceCards.map((card) => {
            const Icon = card.icon
            const value = card.stat && stats ? stats[card.stat] : null
            return (
              <Link key={card.href} href={card.href} data-tone={card.tone} className={cn('admin-panel overview-workspace group relative flex flex-col p-4 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2', `overview-workspace--${card.tone}`)}>
                <div className="flex items-start justify-between gap-4">
                  <span className="overview-workspace-icon"><Icon className="size-[19px]" strokeWidth={1.9} aria-hidden="true" /></span>
                  <ArrowUpRight className="overview-workspace-arrow size-[18px] transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
                <div className="mt-auto pt-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold tracking-tight">{card.title}</h3>
                    {card.stat && value !== null ? <span className="overview-workspace-stat"><strong>{displayMetric(value)}</strong><small>{card.statLabel}</small></span> : null}
                  </div>
                  <p className="mt-1.5 max-w-sm text-sm font-normal leading-5">{card.description}</p>
                </div>
              </Link>
            )
          })}
        </div>
      </section>

      <section className="admin-panel grid gap-4 p-5 sm:grid-cols-3" aria-label="Content and programme totals">
        <PulseStat label="Programmes" value={stats?.totalEvents ?? null} />
        <PulseStat label="Videos" value={stats?.totalYouTubeVideos ?? null} detail={`${displayMetric(stats?.recentVideos ?? null)} added this week`} />
        <PulseStat label="All stories" value={stats?.totalPosts ?? null} />
      </section>
    </div>
  )
}

function PulseStat({ label, value, detail }: { label: string; value: MetricValue; detail?: string }) {
  return (
    <div className="min-w-0 border-b border-zinc-200 pb-4 last:border-0 last:pb-0 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4 sm:last:border-0">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-zinc-950">{displayMetric(value)}</p>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  )
}
