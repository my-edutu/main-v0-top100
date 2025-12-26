'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Users,
  Globe,
  TrendingUp,
  FileText,
  Youtube,
  Calendar,
  BarChart3,
  Activity,
  Settings,
  ChevronRight,
  Download,
  Loader2,
  Plus,
  Eye,
  Star,
  Zap,
  ArrowUpRight
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const ADMIN_ENABLED = true

interface Stats {
  totalAwardees: number
  totalCountries: number
  totalPosts: number
  totalFeaturedPosts: number
  totalYouTubeVideos: number
  recentAwardees: number
  totalEvents: number
  activeUsers: number
  engagementRate: number
  pendingApprovals: number
  recentVideos: number
}

// Navigation Cards Data
const navigationCards = [
  {
    title: 'Awardees',
    description: 'Manage Top100 Africa Future Leaders profiles and recognition',
    href: '/admin/awardees',
    icon: Users,
    color: 'orange',
    stats: 'totalAwardees',
    statsLabel: 'Leaders'
  },
  {
    title: 'Editorial',
    description: 'Create and publish blog posts, news, and articles',
    href: '/admin/blog',
    icon: FileText,
    color: 'purple',
    stats: 'totalPosts',
    statsLabel: 'Posts'
  },
  {
    title: 'Programs',
    description: 'Schedule and manage events, summits, and webinars',
    href: '/admin/events',
    icon: Calendar,
    color: 'blue',
    stats: 'totalEvents',
    statsLabel: 'Events'
  },
  {
    title: 'Channel',
    description: 'Curate YouTube content and video highlights',
    href: '/admin/youtube',
    icon: Youtube,
    color: 'red',
    stats: 'totalYouTubeVideos',
    statsLabel: 'Videos'
  },
  {
    title: 'Insights',
    description: 'Analytics, reports, and performance metrics',
    href: '/admin/analytics',
    icon: BarChart3,
    color: 'emerald',
    stats: 'engagementRate',
    statsLabel: '% Engagement'
  },
  {
    title: 'Settings',
    description: 'Configure platform preferences and integrations',
    href: '/admin/settings',
    icon: Settings,
    color: 'zinc',
    stats: null,
    statsLabel: 'Configure'
  }
]

export default function AdminDashboard() {
  const router = useRouter()

  if (!ADMIN_ENABLED) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div className="max-w-xl space-y-4">
          <h1 className="text-2xl font-semibold text-zinc-800">Admin console offline</h1>
          <p className="text-sm text-zinc-500">
            Internal tooling is paused while we prepare the public launch.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-full bg-orange-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-orange-600"
          >
            Back to homepage
          </a>
        </div>
      </div>
    )
  }

  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)

  const fetchStats = useCallback(async ({ withSpinner = true }: { withSpinner?: boolean } = {}) => {
    try {
      if (withSpinner) setLoading(true)

      const awardeesResponse = await fetch('/api/awardees')
      const eventsResponse = await fetch('/api/events?scope=admin')
      const postsResponse = await fetch('/api/posts?scope=admin')
      const youtubeResponse = await fetch('/api/youtube')
      const usersResponse = await fetch('/api/users')

      const rawAwardees = awardeesResponse.ok ? await awardeesResponse.json() : []
      const events = eventsResponse.ok ? await eventsResponse.json() : []
      const posts = postsResponse.ok ? await postsResponse.json() : []
      const youtubeData = youtubeResponse.ok ? await youtubeResponse.json() : []
      const usersData = usersResponse.ok ? await usersResponse.json() : { users: [] }
      const youtubeVideos = Array.isArray(youtubeData) ? youtubeData : []
      const users = Array.isArray(usersData.users) ? usersData.users : (Array.isArray(usersData) ? usersData : [])

      const normalizedAwardees = Array.isArray(rawAwardees) ? rawAwardees : []
      const totalAwardees = normalizedAwardees.length

      const nonEmptyCountries = normalizedAwardees
        .map((awardee: any) => awardee.country)
        .filter((value: any): value is string => typeof value === 'string' && value.length > 0)

      const totalCountries = new Set(nonEmptyCountries).size
      const totalPosts = Array.isArray(posts) ? posts.length : 0
      const totalFeaturedPosts = Array.isArray(posts)
        ? posts.filter((post: any) => post.is_featured || post.isFeatured).length
        : 0
      const totalYouTubeVideos = Array.isArray(youtubeVideos) ? youtubeVideos.length : 0
      const totalEvents = Array.isArray(events) ? events.length : 0

      // Real metrics from actual data
      const activeUsers = users.length

      // Calculate engagement rate from posts (featured/published ratio)
      const publishedPosts = Array.isArray(posts)
        ? posts.filter((post: any) => post.status === 'published').length
        : 0
      const engagementRate = totalPosts > 0
        ? Math.round((publishedPosts / totalPosts) * 100 * 10) / 10
        : 0

      // Count draft posts as pending approvals
      const pendingApprovals = Array.isArray(posts)
        ? posts.filter((post: any) => post.status === 'draft').length
        : 0

      setStats({
        totalAwardees,
        totalCountries,
        totalPosts,
        totalFeaturedPosts,
        totalYouTubeVideos,
        recentAwardees: normalizedAwardees.filter((a: any) => {
          const created = new Date(a.created_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return created > weekAgo
        }).length,
        totalEvents,
        activeUsers,
        engagementRate,
        pendingApprovals,
        recentVideos: youtubeVideos.filter((v: any) => {
          const created = new Date(v.created_at)
          const weekAgo = new Date()
          weekAgo.setDate(weekAgo.getDate() - 7)
          return created > weekAgo
        }).length
      })

    } catch (error) {
      console.error('Error fetching stats:', error)
      if (withSpinner) toast.error('Failed to load dashboard stats')
    } finally {
      if (withSpinner) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    const interval = setInterval(() => fetchStats({ withSpinner: false }), 30000)
    return () => clearInterval(interval)
  }, [fetchStats])

  const getColorClasses = (color: string) => {
    const colors: Record<string, { card: string; iconBg: string; icon: string; badge: string; border: string; text: string; desc: string; hover: string }> = {
      orange: {
        card: 'bg-gradient-to-br from-orange-500 to-amber-500 text-white',
        iconBg: 'bg-white/20 backdrop-blur-md',
        icon: 'text-white',
        badge: 'bg-white/20 text-white border-white/30',
        border: 'border-orange-400',
        hover: 'hover:shadow-orange-200 hover:-translate-y-1',
        text: 'text-white',
        desc: 'text-orange-50'
      },
      purple: {
        card: 'bg-gradient-to-br from-purple-600 to-indigo-600 text-white',
        iconBg: 'bg-white/20 backdrop-blur-md',
        icon: 'text-white',
        badge: 'bg-white/20 text-white border-white/30',
        border: 'border-purple-400',
        hover: 'hover:shadow-purple-200 hover:-translate-y-1',
        text: 'text-white',
        desc: 'text-purple-50'
      },
      blue: {
        card: 'bg-gradient-to-br from-blue-600 to-cyan-600 text-white',
        iconBg: 'bg-white/20 backdrop-blur-md',
        icon: 'text-white',
        badge: 'bg-white/20 text-white border-white/30',
        border: 'border-blue-400',
        hover: 'hover:shadow-blue-200 hover:-translate-y-1',
        text: 'text-white',
        desc: 'text-blue-50'
      },
      red: {
        card: 'bg-gradient-to-br from-rose-500 to-red-600 text-white',
        iconBg: 'bg-white/20 backdrop-blur-md',
        icon: 'text-white',
        badge: 'bg-white/20 text-white border-white/30',
        border: 'border-red-400',
        hover: 'hover:shadow-red-200 hover:-translate-y-1',
        text: 'text-white',
        desc: 'text-red-50'
      },
      emerald: {
        card: 'bg-gradient-to-br from-emerald-500 to-teal-600 text-white',
        iconBg: 'bg-white/20 backdrop-blur-md',
        icon: 'text-white',
        badge: 'bg-white/20 text-white border-white/30',
        border: 'border-emerald-400',
        hover: 'hover:shadow-emerald-200 hover:-translate-y-1',
        text: 'text-white',
        desc: 'text-emerald-50'
      },
      zinc: {
        card: 'bg-gradient-to-br from-zinc-700 to-zinc-900 text-white',
        iconBg: 'bg-white/20 backdrop-blur-md',
        icon: 'text-white',
        badge: 'bg-white/20 text-white border-white/30',
        border: 'border-zinc-600',
        hover: 'hover:shadow-zinc-300 hover:-translate-y-1',
        text: 'text-white',
        desc: 'text-zinc-300'
      },
    }
    return colors[color] || colors.orange
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Section */}
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between pt-20 lg:pt-0">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold">Dashboard Overview</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 leading-none">
            Welcome <span className="text-orange-500">Back</span>
          </h1>
          <p className="text-zinc-500 text-sm sm:text-lg max-w-xl font-medium">
            {stats?.totalAwardees
              ? `Managing ${stats.totalAwardees} leaders from ${stats.totalCountries} countries.`
              : 'Loading your performance metrics...'
            }
          </p>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <Button variant="outline" size="sm" className="border-zinc-200 text-zinc-600 hover:bg-zinc-50 rounded-xl whitespace-nowrap">
            <Download className="h-4 w-4 mr-2" />
            <span>Export Data</span>
          </Button>
          <Link href="/admin/awardees/new">
            <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl shadow-md shadow-orange-200 whitespace-nowrap">
              <Plus className="h-4 w-4 mr-1" />
              Add Awardee
            </Button>
          </Link>
        </div>
      </div>

      {/* Navigation Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-xl font-black text-zinc-900 tracking-tight">Quick Access</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          {navigationCards.map((card) => {
            const colorClasses = getColorClasses(card.color)
            const Icon = card.icon
            const statValue = card.stats && stats ? (stats as any)[card.stats] : null

            return (
              <Link key={card.href} href={card.href} className="contents">
                <Card className={cn(
                  "group cursor-pointer transition-all duration-500 border-none shadow-md overflow-hidden relative rounded-[2rem] h-full",
                  colorClasses.card,
                  colorClasses.hover
                )}>
                  {/* Faded Background Icon */}
                  <div className="absolute -right-2 -bottom-2 opacity-10 transition-transform duration-700 group-hover:scale-110 group-hover:-rotate-12 pointer-events-none">
                    <Icon className="h-20 w-20" />
                  </div>

                  <CardHeader className="p-4 pb-2 relative z-10">
                    <div className="flex items-start justify-between">
                      <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shadow-lg", colorClasses.iconBg)}>
                        <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6", colorClasses.icon)} />
                      </div>
                    </div>
                    <CardTitle className={cn("text-base sm:text-xl font-bold mt-2 leading-tight", colorClasses.text)}>{card.title}</CardTitle>
                    <CardDescription className={cn("text-[10px] sm:text-xs line-clamp-2 font-medium opacity-80 mt-0.5", colorClasses.desc)}>
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-2 relative z-10">
                    <div className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border", colorClasses.badge)}>
                      {loading && card.stats ? (
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                      ) : (
                        <>
                          {statValue !== null ? statValue : <Zap className="h-2.5 w-2.5" />}
                          <span className="truncate">{card.statsLabel}</span>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Recent Activity Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Feed */}
        <Card className="border-zinc-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-bold text-zinc-800 flex items-center gap-2">
                <Activity className="h-5 w-5 text-orange-500" />
                Recent Activity
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-orange-600">
                View All <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse flex gap-3">
                    <div className="h-10 w-10 rounded-xl bg-zinc-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-zinc-100 rounded w-3/4" />
                      <div className="h-2 bg-zinc-100 rounded w-1/2" />
                    </div>
                  </div>
                ))
              ) : (
                <>
                  <ActivityItem
                    title="New awardee added"
                    description="John Doe from Nigeria"
                    time="2 min ago"
                    icon={Users}
                    color="orange"
                  />
                  <ActivityItem
                    title="Blog post published"
                    description="Africa's Tech Revolution"
                    time="15 min ago"
                    icon={FileText}
                    color="purple"
                  />
                  <ActivityItem
                    title="Event scheduled"
                    description="Leadership Summit 2025"
                    time="1 hour ago"
                    icon={Calendar}
                    color="blue"
                  />
                  <ActivityItem
                    title="Video published"
                    description="Awardee Interview Series"
                    time="3 hours ago"
                    icon={Youtube}
                    color="red"
                  />
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="border-zinc-200">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-zinc-800 flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <QuickAction href="/admin/awardees/new" icon={Plus} label="Add Awardee" color="orange" />
              <QuickAction href="/admin/blog/new" icon={FileText} label="New Post" color="purple" />
              <QuickAction href="/admin/events?create=true" icon={Calendar} label="Create Event" color="blue" />
              <QuickAction href="/admin/youtube" icon={Youtube} label="Add Video" color="red" />
              <QuickAction href="/admin/analytics" icon={Eye} label="View Reports" color="emerald" />
              <QuickAction href="/admin/settings" icon={Settings} label="Settings" color="zinc" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <Card className="border-zinc-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-zinc-800 flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Top Content Performance
            </CardTitle>
            <Link href="/admin/analytics">
              <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-orange-600">
                Full Report <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="animate-pulse h-12 bg-zinc-50 rounded-xl" />
              ))
            ) : (
              <>
                <PerformanceRow title="Africa's Tech Revolution" views={12450} growth={23} />
                <PerformanceRow title="Rising Leaders in Agriculture" views={9800} growth={18} />
                <PerformanceRow title="Education for All Initiative" views={8250} growth={12} />
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// Helper Components
function QuickStat({ label, value, icon: Icon, loading, color }: any) {
  const colorMap: Record<string, string> = {
    orange: 'from-orange-500 to-amber-500 text-white shadow-orange-100',
    blue: 'from-blue-500 to-cyan-500 text-white shadow-blue-100',
    purple: 'from-purple-500 to-indigo-500 text-white shadow-purple-100',
    emerald: 'from-emerald-500 to-teal-500 text-white shadow-emerald-100'
  }
  const colorClasses = colorMap[color] || colorMap.orange

  return (
    <div className={cn("bg-gradient-to-br rounded-3xl p-4 shadow-lg transition-transform hover:-translate-y-1 duration-300 relative overflow-hidden group", colorClasses)}>
      {/* Background Icon */}
      <div className="absolute -right-2 -bottom-2 opacity-10 transition-transform duration-500 group-hover:scale-110">
        <Icon className="h-20 w-20" />
      </div>

      <div className="relative z-10">
        <div className="bg-white/20 backdrop-blur-md h-10 w-10 rounded-xl flex items-center justify-center mb-3 border border-white/10">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="text-2xl font-bold">
          {loading ? <div className="h-7 w-12 bg-white/20 rounded animate-pulse" /> : value}
        </div>
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</div>
      </div>
    </div>
  )
}

function ActivityItem({ title, description, time, icon: Icon, color }: any) {
  const colorMap: Record<string, string> = {
    orange: 'bg-orange-50 text-orange-500',
    purple: 'bg-purple-50 text-purple-500',
    blue: 'bg-blue-50 text-blue-500',
    red: 'bg-red-50 text-red-500'
  }

  return (
    <div className="flex items-start gap-3">
      <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center shrink-0", colorMap[color])}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-800 truncate">{title}</p>
        <p className="text-xs text-zinc-500 truncate">{description}</p>
      </div>
      <span className="text-[10px] text-zinc-400 whitespace-nowrap">{time}</span>
    </div>
  )
}

function QuickAction({ href, icon: Icon, label, color }: any) {
  const colorMap: Record<string, string> = {
    orange: 'hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600',
    purple: 'hover:bg-purple-50 hover:border-purple-200 hover:text-purple-600',
    blue: 'hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600',
    red: 'hover:bg-red-50 hover:border-red-200 hover:text-red-600',
    emerald: 'hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600',
    zinc: 'hover:bg-zinc-50 hover:border-zinc-300 hover:text-zinc-700'
  }

  return (
    <Link href={href}>
      <button className={cn(
        "w-full flex items-center gap-2 p-3 rounded-xl border border-zinc-200 text-zinc-600 text-sm font-medium transition-all",
        colorMap[color]
      )}>
        <Icon className="h-4 w-4" />
        {label}
      </button>
    </Link>
  )
}

function PerformanceRow({ title, views, growth }: { title: string; views: number; growth: number }) {
  return (
    <div className="flex items-center justify-between p-3 bg-zinc-50 rounded-xl hover:bg-orange-50/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center">
          <FileText className="h-4 w-4 text-zinc-400" />
        </div>
        <span className="text-sm font-medium text-zinc-800 truncate max-w-[200px]">{title}</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-bold text-zinc-800">{views.toLocaleString()}</p>
          <p className="text-[10px] text-zinc-400">views</p>
        </div>
        <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
          <TrendingUp className="h-3 w-3" />
          <span className="text-xs font-bold">{growth}%</span>
        </div>
      </div>
    </div>
  )
}
