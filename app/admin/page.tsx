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
  featured?: boolean
}

const workspaceCards: WorkspaceCard[] = [
  { title: 'Awardees', description: 'Review profiles, visibility, cohorts, and featured leaders.', href: '/admin/awardees', icon: Users, stat: 'totalAwardees', statLabel: 'leaders', featured: true },
  { title: 'Awards & delivery', description: 'Track verified payments, shipping quotes, and dispatch exceptions.', href: '/admin/awards', icon: Award, featured: true },
  { title: 'Invites', description: 'Create claim codes and guide awardees into the member workspace.', href: '/admin/invites', icon: KeyRound },
  { title: 'Member Hub', description: 'Review members, submissions, and dashboard communications.', href: '/admin/member-hub', icon: Bell, stat: 'totalUsers', statLabel: 'accounts' },
  { title: 'Editorial', description: 'Create and publish stories from across the Top100 community.', href: '/admin/blog', icon: FileText, stat: 'totalPosts', statLabel: 'posts' },
  { title: 'Programs', description: 'Manage events, summits, webinars, and member invitations.', href: '/admin/events', icon: Calendar, stat: 'totalEvents', statLabel: 'programs' },
  { title: 'Channel', description: 'Curate interviews and video stories for the public platform.', href: '/admin/youtube', icon: Youtube, stat: 'totalYouTubeVideos', statLabel: 'videos' },
  { title: 'Insights', description: 'Understand the real reach and activity recorded by the platform.', href: '/admin/analytics', icon: BarChart3 },
  { title: 'Settings', description: 'Manage platform preferences and operational integrations.', href: '/admin/settings', icon: Settings },
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
  const [stats, setStats] = useState<Stats | null>(null)
  const [cohorts, setCohorts] = useState<[string, number][]>([])
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)

  const fetchStats = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    if (withSpinner) setLoading(true)

    try {
      const responses = await Promise.allSettled([
        fetch('/api/awardees'),
        fetch('/api/events?scope=admin'),
        fetch('/api/posts?scope=admin'),
        fetch('/api/youtube'),
        fetch('/api/users'),
      ])
      const payloads = await Promise.all(
        responses.map(async (result) => (result.status === 'fulfilled' && result.value.ok ? result.value.json().catch(() => null) : null)),
      )

      const awardees = readObjectArray(payloads[0], 'awardees')
      const events = readObjectArray(payloads[1], 'events')
      const posts = readObjectArray(payloads[2], 'posts')
      const videos = readObjectArray(payloads[3], 'videos')
      const users = readObjectArray(payloads[4], 'users')

      setPartialFailure([awardees, events, posts, videos, users].some((value) => value === null))
      const counts = new Map<string, number>()
      for (const row of awardees ?? []) {
        const year = String((row as Record<string, unknown>).year || 'Unspecified')
        counts.set(year, (counts.get(year) ?? 0) + 1)
      }
      setCohorts([...counts].sort(([a], [b]) => a.localeCompare(b)))
      setUpdatedAt(new Date().toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' }))
      setStats({
        totalAwardees: awardees?.length ?? null,
        totalCountries: awardees
          ? new Set(awardees.map((row) => stringField(row, 'country').trim()).filter(Boolean)).size
          : null,
        totalPosts: posts?.length ?? null,
        publishedPosts: posts ? posts.filter((row) => stringField(row, 'status') === 'published').length : null,
        totalYouTubeVideos: videos?.length ?? null,
        recentAwardees: recentCount(awardees),
        totalEvents: events?.length ?? null,
        totalUsers: users?.length ?? null,
        draftPosts: posts ? posts.filter((row) => stringField(row, 'status') === 'draft').length : null,
        recentVideos: recentCount(videos),
      })
    } catch {
      setPartialFailure(true)
    } finally {
      setLoading(false)
    }
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
        <section className="overview-focus" aria-labelledby="focus-title">
          <p className="admin-kicker">Start here</p><h2 id="focus-title">A little attention.<br />A lot of impact.</h2>
          <p className="overview-focus-copy">Keep the next step moving for your community.</p>
          <Link href="/admin/awards" className="overview-task"><span><strong>Awards & delivery</strong><small>Check paid orders waiting for dispatch.</small></span><ArrowUpRight size={20} /></Link>
          <Link href="/admin/blog" className="overview-task"><span><strong>Editorial desk</strong><small>{displayMetric(stats?.draftPosts ?? null)} draft stories to work on</small></span><ArrowUpRight size={20} /></Link>
          <Link href="/admin/messages" className="overview-task"><span><strong>Community inbox</strong><small>Review volunteer offers and cash pledges.</small></span><ArrowUpRight size={20} /></Link>
          <details className="overview-hint"><summary>What should I handle first?</summary><p>Start with delivery exceptions, then review submissions. Opening a workspace does not send messages, publish content, or dispatch awards.</p></details>
        </section>
        <section className="admin-panel overview-chart" aria-labelledby="cohort-title">
          <div className="overview-chart-heading"><div><p className="admin-kicker">Our community</p><h2 id="cohort-title">Leaders by cohort</h2></div><Users size={20} /></div>
          <p className="overview-chart-caption">Distribution of the current public directory.</p>
          {stats?.totalAwardees == null ? <p className="py-8 text-sm">{loading ? 'Loading directory…' : 'Directory data unavailable.'}</p> : !cohorts.length ? <p className="py-8 text-sm">No directory entries yet.</p> : <div className="overview-bars">{cohorts.map(([year, count]) => <div key={year}><div className="flex justify-between gap-3 text-sm"><span>{year}</span><span className="tabular-nums">{displayMetric(count)}</span></div><div className="overview-bar-track" aria-hidden="true"><div style={{ width: `${count / Math.max(...cohorts.map(([, value]) => value), 1) * 100}%` }} /></div></div>)}</div>}
          <Link className="overview-text-link" href="/admin/awardees">Explore directory <ArrowUpRight size={16} /></Link>
        </section>
        <section className="admin-panel overview-chart" aria-labelledby="publishing-title">
          <div className="overview-chart-heading"><div><p className="admin-kicker">Editorial pulse</p><h2 id="publishing-title">Stories in motion</h2></div><FileText size={20} /></div>
          <p className="overview-chart-caption">Current publishing status, not a growth forecast.</p>
          {stats?.totalPosts == null ? <p className="py-8 text-sm">{loading ? 'Loading stories…' : 'Editorial data unavailable.'}</p> : <>
            <div className="overview-publishing-total">{displayMetric(stats.totalPosts)} <span>stories</span></div>
            <div className="overview-publishing-bar" aria-hidden="true"><span style={{width:`${(stats.publishedPosts ?? 0) / Math.max(stats.totalPosts, 1) * 100}%`}} /><span style={{width:`${(stats.draftPosts ?? 0) / Math.max(stats.totalPosts, 1) * 100}%`}} /></div>
            <div className="overview-legend"><span>Published <b>{displayMetric(stats.publishedPosts)}</b></span><span>Drafts <b>{displayMetric(stats.draftPosts)}</b></span><span>Other <b>{displayMetric(stats.totalPosts - (stats.publishedPosts ?? 0) - (stats.draftPosts ?? 0))}</b></span></div>
          </>}
          <details className="overview-hint"><summary>About these numbers</summary><p>Counts come from the editorial API. Other includes any status besides published and draft. A dash means the source could not be loaded.</p></details>
        </section>
      </div>

      <section aria-labelledby="workspaces-heading" className="space-y-3">
        <div><h2 id="workspaces-heading" className="text-lg font-semibold tracking-tight text-zinc-950">Your workspaces</h2><p className="mt-1 text-sm text-zinc-500">Everything you need, one step away.</p></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {workspaceCards.map((card) => {
            const Icon = card.icon
            const value = card.stat && stats ? stats[card.stat] : null
            return (
              <Link key={card.href} href={card.href} className="admin-panel overview-workspace group relative flex flex-col p-4 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2">
                <div className="flex items-start justify-between gap-4">
                  <span className={cn('grid size-10 place-items-center rounded-xl', card.featured ? 'bg-white/60' : 'bg-zinc-100')}><Icon className="size-[19px]" strokeWidth={1.9} aria-hidden="true" /></span>
                  <ArrowUpRight className="size-[18px] text-zinc-500 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden="true" />
                </div>
                <div className="mt-auto pt-5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-base font-semibold tracking-tight text-zinc-950">{card.title}</h3>
                    {card.stat && value !== null ? <span className="text-xs font-medium tabular-nums text-zinc-600">{displayMetric(value)} {card.statLabel}</span> : null}
                  </div>
                  <p className="mt-1.5 max-w-sm text-sm font-normal leading-5 text-zinc-600">{card.description}</p>
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
