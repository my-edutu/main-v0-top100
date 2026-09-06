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

  const fetchStats = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    if (withSpinner) setLoading(true)

    try {
      const responses = await Promise.all([
        fetch('/api/awardees'),
        fetch('/api/events?scope=admin'),
        fetch('/api/posts?scope=admin'),
        fetch('/api/youtube'),
        fetch('/api/users'),
      ])
      const payloads = await Promise.all(
        responses.map(async (response) => (response.ok ? response.json().catch(() => null) : null)),
      )

      const awardees = readObjectArray(payloads[0], 'awardees')
      const events = readObjectArray(payloads[1], 'events')
      const posts = readObjectArray(payloads[2], 'posts')
      const videos = readObjectArray(payloads[3], 'videos')
      const users = readObjectArray(payloads[4], 'users')

      setPartialFailure([awardees, events, posts, videos, users].some((value) => value === null))
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
    const interval = window.setInterval(() => void fetchStats({ withSpinner: false }), 30_000)
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
    { label: 'Member accounts', value: stats?.totalUsers ?? null, detail: 'Registered platform users', icon: KeyRound },
  ]

  return (
    <div className="space-y-7 pb-4">
      <PageHeader
        eyebrow="Operations"
        title="Command centre"
        description="The people, programmes, content, and delivery work behind Top100—kept clear and ready to act on."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => void fetchStats()} disabled={loading} className="rounded-xl border-zinc-200 bg-white font-medium text-zinc-700 shadow-none">
              <RefreshCw className={cn('size-4', loading && 'animate-spin')} aria-hidden="true" />
              Refresh
            </Button>
            <Button asChild size="sm" className="rounded-xl bg-[#181715] font-medium text-white shadow-none hover:bg-zinc-800">
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
          <div><p className="admin-kicker">Live snapshot</p><h2 id="snapshot-heading" className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">What the platform holds now</h2></div>
          {loading ? <Loader2 className="size-4 animate-spin text-zinc-400" aria-label="Refreshing totals" /> : null}
        </div>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {headlineMetrics.map((metric) => {
            const Icon = metric.icon
            return (
              <article key={metric.label} className="admin-panel min-w-0 p-4 sm:p-5">
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

      <section aria-labelledby="workspaces-heading" className="space-y-3">
        <div><p className="admin-kicker">Workspaces</p><h2 id="workspaces-heading" className="mt-1 text-lg font-semibold tracking-tight text-zinc-950">Choose what needs attention</h2></div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {workspaceCards.map((card) => {
            const Icon = card.icon
            const value = card.stat && stats ? stats[card.stat] : null
            return (
              <Link key={card.href} href={card.href} className={cn('admin-panel group relative flex min-h-[150px] flex-col overflow-hidden p-5 transition-colors hover:border-zinc-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2', card.featured && 'border-orange-400 bg-gradient-to-r from-orange-500 to-amber-500 hover:border-orange-600')}>
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
